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

