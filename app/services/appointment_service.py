import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.professional import Professional, ProfessionalService
from app.models.service import Service
from app.models.package import (
    CustomerPackage,
    CustomerPackageBalance,
    PackageStatus,
)
from app.models.appointment import (
    Appointment,
    AppointmentStatus,
    PaymentType,
)
from app.core.config import settings
from app.models.settings import BusinessSettings
from app.models.ledger import (
    CreditLedgerTransaction,
    LedgerTransactionType,
)


class InsufficientCreditsError(HTTPException):
    def __init__(self, detail: str = "Insufficient package credits"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class SlotUnavailableError(HTTPException):
    def __init__(self, detail: str = "Professional slot is not available"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)


class PackageExpiredError(HTTPException):
    def __init__(self, detail: str = "Package has expired or is inactive"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class AppointmentNotFoundError(HTTPException):
    def __init__(self, detail: str = "Appointment not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class InvalidAppointmentStatusError(HTTPException):
    def __init__(self, detail: str = "Appointment cannot be cancelled"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class AppointmentService:
    @staticmethod
    def book_with_credit(
        db: Session,
        customer_package_id: int,
        service_id: int,
        professional_id: int,
        start_time: datetime.datetime,
        idempotency_key: Optional[str] = None,
    ) -> Appointment:
        """
        Executes appointment booking with credit deduction in an ACID transaction:
        1. Checks idempotency: if idempotency_key is provided and exists, returns existing Appointment.
        2. Validates package is ACTIVE, now <= expires_at, and balance.remaining_quantity > 0.
        3. Validates professional and service exist and are active.
        4. Calculates end_time using custom professional duration if set, else service duration.
        5. Locks and checks professional schedule overlap. If conflict exists, aborts with 409 Conflict.
        6. Creates Appointment with status=BOOKED, payment_type=PACKAGE_CREDIT.
        7. Decrements balance: remaining_quantity -= 1.
        8. Records in Ledger: DEBIT_BOOKING (-1).
        9. Commits and returns Appointment.
        """
        # 1. Idempotency check
        if idempotency_key:
            existing_tx = db.scalar(
                select(CreditLedgerTransaction).where(
                    CreditLedgerTransaction.idempotency_key == idempotency_key,
                    CreditLedgerTransaction.type == LedgerTransactionType.DEBIT_BOOKING,
                )
            )
            if existing_tx and existing_tx.appointment_id:
                existing_appt = db.get(Appointment, existing_tx.appointment_id)
                if existing_appt:
                    return existing_appt

        # Normalize start_time
        if start_time.tzinfo is not None:
            start_time = start_time.replace(tzinfo=None)

        # 2. Package validation
        customer_package = db.get(CustomerPackage, customer_package_id)
        if customer_package is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer package {customer_package_id} not found",
            )

        now = datetime.datetime.now()
        current_now = (
            datetime.datetime.now(datetime.timezone.utc)
            if (customer_package.expires_at and customer_package.expires_at.tzinfo is not None)
            else now
        )
        if customer_package.status != PackageStatus.ACTIVE or customer_package.expires_at < current_now:
            if customer_package.status == PackageStatus.ACTIVE:
                customer_package.status = PackageStatus.EXPIRED
                db.commit()
            raise PackageExpiredError("Package has expired or is inactive")

        # 3. Professional validation
        professional = db.get(Professional, professional_id)
        if professional is None or not professional.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Professional {professional_id} not found or inactive",
            )

        # 4. Service validation and duration calculation
        service = db.get(Service, service_id)
        if service is None or not service.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service {service_id} not found or inactive",
            )

        duration_minutes = service.duration_minutes
        prof_service = db.scalar(
            select(ProfessionalService).where(
                ProfessionalService.professional_id == professional_id,
                ProfessionalService.service_id == service_id,
            )
        )
        if prof_service and prof_service.custom_duration_minutes is not None:
            duration_minutes = prof_service.custom_duration_minutes

        end_time = start_time + datetime.timedelta(minutes=duration_minutes)

        # 5. Lock balance with with_for_update()
        balance = db.scalar(
            select(CustomerPackageBalance)
            .where(
                CustomerPackageBalance.customer_package_id == customer_package_id,
                CustomerPackageBalance.service_id == service_id,
            )
            .with_for_update()
        )
        if balance is None or balance.remaining_quantity <= 0:
            raise InsufficientCreditsError("Insufficient credits for this service")

        # 6. Lock and check professional schedule overlap
        conflict_stmt = (
            select(Appointment)
            .where(
                Appointment.professional_id == professional_id,
                Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
                Appointment.start_time < end_time,
                Appointment.end_time > start_time,
            )
            .with_for_update()
        )
        conflict = db.scalar(conflict_stmt)
        if conflict is not None:
            raise SlotUnavailableError("Professional has an overlapping appointment in this time slot")

        try:
            # 7. Create Appointment
            appointment = Appointment(
                professional_id=professional_id,
                customer_id=customer_package.customer_id,
                service_id=service_id,
                start_time=start_time,
                end_time=end_time,
                status=AppointmentStatus.BOOKED,
                payment_type=PaymentType.PACKAGE_CREDIT,
            )
            db.add(appointment)
            db.flush()

            # 8. Abate balance
            balance.remaining_quantity -= 1

            # 9. Record in Ledger
            ledger_tx = CreditLedgerTransaction(
                customer_package_id=customer_package.id,
                service_id=service_id,
                appointment_id=appointment.id,
                type=LedgerTransactionType.DEBIT_BOOKING,
                amount=-1,
                balance_after=balance.remaining_quantity,
                idempotency_key=idempotency_key,
                notes=f"Booking appointment #{appointment.id}",
            )
            db.add(ledger_tx)

            db.commit()
            db.refresh(appointment)
            return appointment
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def cancel_appointment(
        db: Session,
        appointment_id: int,
        cancellation_reason: Optional[str] = None,
    ) -> Appointment:
        """
        Cancels an appointment and refunds package credit if within cancellation deadline:
        1. Locks Appointment with with_for_update().
        2. If status is already CANCELLED or COMPLETED, raises 400.
        3. Retrieves cancellation_window_hours from BusinessSettings (fallback to settings.CANCELLATION_WINDOW_HOURS / 2).
        4. Calculates deadline = appointment.start_time - timedelta(hours=window_hours).
        5. If now <= deadline and payment_type == PaymentType.PACKAGE_CREDIT:
           - Finds original DEBIT_BOOKING in CreditLedgerTransaction.
           - Locks CustomerPackageBalance with with_for_update().
           - Increments balance.remaining_quantity += 1.
           - If package status was EXHAUSTED, restores to ACTIVE.
           - Inserts REFUND_CANCELLATION in CreditLedgerTransaction (+1).
        6. Updates appointment status=CANCELLED, cancelled_at=now, cancellation_reason=reason.
        7. Commits and returns Appointment.
        """
        # 1. Lock Appointment with with_for_update()
        appointment = db.scalar(
            select(Appointment).where(Appointment.id == appointment_id).with_for_update()
        )
        if appointment is None:
            raise AppointmentNotFoundError(f"Appointment {appointment_id} not found")

        # 2. Status validation
        if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
            raise InvalidAppointmentStatusError(
                f"Cannot cancel appointment with status {appointment.status.value}"
            )

        # 3. Determine cancellation window
        business_settings = db.scalar(select(BusinessSettings).limit(1))
        if business_settings and business_settings.cancellation_window_hours is not None:
            window_hours = business_settings.cancellation_window_hours
        else:
            window_hours = getattr(settings, "CANCELLATION_WINDOW_HOURS", 2)

        # 4. Calculate deadline and check window
        now = datetime.datetime.now()
        start_time = appointment.start_time
        if start_time.tzinfo is not None and now.tzinfo is None:
            now = datetime.datetime.now(start_time.tzinfo)
        elif start_time.tzinfo is None and now.tzinfo is not None:
            now = now.replace(tzinfo=None)

        deadline = start_time - datetime.timedelta(hours=window_hours)
        is_within_deadline = (now <= deadline)

        try:
            # 5. Refund credit if within deadline and paid with package credit
            if is_within_deadline and appointment.payment_type == PaymentType.PACKAGE_CREDIT:
                debit_tx = db.scalar(
                    select(CreditLedgerTransaction).where(
                        CreditLedgerTransaction.appointment_id == appointment.id,
                        CreditLedgerTransaction.type == LedgerTransactionType.DEBIT_BOOKING,
                    )
                )
                if debit_tx:
                    balance = db.scalar(
                        select(CustomerPackageBalance)
                        .where(
                            CustomerPackageBalance.customer_package_id == debit_tx.customer_package_id,
                            CustomerPackageBalance.service_id == debit_tx.service_id,
                        )
                        .with_for_update()
                    )
                    if balance:
                        balance.remaining_quantity += 1

                        customer_package = db.get(CustomerPackage, balance.customer_package_id)
                        if customer_package and customer_package.status == PackageStatus.EXHAUSTED:
                            customer_package.status = PackageStatus.ACTIVE

                        refund_tx = CreditLedgerTransaction(
                            customer_package_id=balance.customer_package_id,
                            service_id=balance.service_id,
                            appointment_id=appointment.id,
                            type=LedgerTransactionType.REFUND_CANCELLATION,
                            amount=1,
                            balance_after=balance.remaining_quantity,
                            notes=f"Refund cancellation for appointment #{appointment.id}",
                        )
                        db.add(refund_tx)

            # 6. Update appointment
            appointment.status = AppointmentStatus.CANCELLED
            appointment.cancelled_at = now
            appointment.cancellation_reason = cancellation_reason

            db.commit()
            db.refresh(appointment)
            return appointment
        except Exception:
            db.rollback()
            raise


