import datetime
from decimal import Decimal
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Customer,
    Professional,
    Service,
    ProfessionalService,
    Package,
    PackageItem,
    CustomerPackage,
    CustomerPackageBalance,
    PackageStatus,
    Appointment,
    AppointmentStatus,
    PaymentType,
    CreditLedgerTransaction,
    LedgerTransactionType,
)
from app.core.database import get_db

from app.schemas.appointment import (
    BookWithCreditRequest,
    AppointmentResponse,
)
from app.services.appointment_service import (
    AppointmentService,
    InsufficientCreditsError,
    SlotUnavailableError,
    PackageExpiredError,
    AppointmentNotFoundError,
)
from app.api.v1.appointments import router as appointments_router


@pytest.fixture
def sample_customer(db_session: Session) -> Customer:
    customer = Customer(
        name="Lucas Silva",
        phone="11977778888",
        email="lucas@example.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def sample_service(db_session: Session) -> Service:
    service = Service(
        name="Corte Tradicional",
        duration_minutes=30,
        price=Decimal("40.00"),
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture
def sample_professional(db_session: Session, sample_service: Service) -> Professional:
    prof = Professional(
        name="Barbeiro Mestre",
        phone="11966665555",
        is_active=True,
    )
    db_session.add(prof)
    db_session.commit()
    db_session.refresh(prof)

    prof_service = ProfessionalService(
        professional_id=prof.id,
        service_id=sample_service.id,
        custom_duration_minutes=None,
    )
    db_session.add(prof_service)
    db_session.commit()
    return prof


@pytest.fixture
def sample_customer_package(
    db_session: Session, sample_customer: Customer, sample_service: Service
) -> CustomerPackage:
    pkg = Package(
        name="Pacote 4 Cortes",
        price=Decimal("120.00"),
        validity_days=30,
        is_active=True,
    )
    pkg.items.append(PackageItem(service_id=sample_service.id, quantity=4))
    db_session.add(pkg)
    db_session.commit()

    now = datetime.datetime.now()
    cp = CustomerPackage(
        customer_id=sample_customer.id,
        package_id=pkg.id,
        status=PackageStatus.ACTIVE,
        purchased_at=now,
        expires_at=now + datetime.timedelta(days=30),
    )
    db_session.add(cp)
    db_session.commit()

    bal = CustomerPackageBalance(
        customer_package_id=cp.id,
        service_id=sample_service.id,
        total_quantity=4,
        remaining_quantity=4,
    )
    db_session.add(bal)

    ledger_tx = CreditLedgerTransaction(
        customer_package_id=cp.id,
        service_id=sample_service.id,
        type=LedgerTransactionType.PURCHASE,
        amount=4,
        balance_after=4,
        notes="Initial purchase",
    )
    db_session.add(ledger_tx)
    db_session.commit()
    db_session.refresh(cp)
    return cp


@pytest.fixture
def test_client(db_session: Session) -> TestClient:
    app = FastAPI()
    app.include_router(appointments_router, prefix="/api/v1")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_book_with_credit_success(
    db_session: Session,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
):
    """Test successful booking with credit, verifying -1 deduction, DEBIT_BOOKING in Ledger."""
    start_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=1, hours=10)

    appointment = AppointmentService.book_with_credit(
        db=db_session,
        customer_package_id=sample_customer_package.id,
        service_id=sample_service.id,
        professional_id=sample_professional.id,
        start_time=start_time,
        idempotency_key="book-key-001",
    )

    assert appointment.id is not None
    assert appointment.customer_id == sample_customer_package.customer_id
    assert appointment.professional_id == sample_professional.id
    assert appointment.service_id == sample_service.id
    assert appointment.start_time == start_time
    assert appointment.end_time == start_time + datetime.timedelta(minutes=30)
    assert appointment.status == AppointmentStatus.BOOKED
    assert appointment.payment_type == PaymentType.PACKAGE_CREDIT

    # Verify balance was decremented from 4 to 3
    balance = (
        db_session.query(CustomerPackageBalance)
        .filter_by(
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
        )
        .one()
    )
    assert balance.remaining_quantity == 3

    # Verify ledger entry
    tx = (
        db_session.query(CreditLedgerTransaction)
        .filter_by(
            customer_package_id=sample_customer_package.id,
            idempotency_key="book-key-001",
        )
        .one()
    )
    assert tx.type == LedgerTransactionType.DEBIT_BOOKING
    assert tx.amount == -1
    assert tx.balance_after == 3
    assert tx.appointment_id == appointment.id


def test_book_with_credit_custom_duration(
    db_session: Session,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
):
    """Test that end_time respects professional's custom duration if defined."""
    # Set custom duration of 45 minutes for this professional
    prof_svc = (
        db_session.query(ProfessionalService)
        .filter_by(
            professional_id=sample_professional.id,
            service_id=sample_service.id,
        )
        .one()
    )
    prof_svc.custom_duration_minutes = 45
    db_session.commit()

    start_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=2, hours=14)

    appointment = AppointmentService.book_with_credit(
        db=db_session,
        customer_package_id=sample_customer_package.id,
        service_id=sample_service.id,
        professional_id=sample_professional.id,
        start_time=start_time,
    )

    assert appointment.end_time == start_time + datetime.timedelta(minutes=45)


def test_book_with_credit_insufficient_credits(
    db_session: Session,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
):
    """Booking fails with 400 when remaining_quantity is 0."""
    balance = (
        db_session.query(CustomerPackageBalance)
        .filter_by(
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
        )
        .one()
    )
    balance.remaining_quantity = 0
    db_session.commit()

    start_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=1, hours=11)

    with pytest.raises((InsufficientCreditsError, HTTPException)) as exc_info:
        AppointmentService.book_with_credit(
            db=db_session,
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
            professional_id=sample_professional.id,
            start_time=start_time,
        )
    assert exc_info.value.status_code == 400


def test_book_with_credit_expired_package(
    db_session: Session,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
):
    """Booking fails with 400 when package is expired."""
    sample_customer_package.expires_at = datetime.datetime.now() - datetime.timedelta(days=1)
    db_session.commit()

    start_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=1, hours=12)

    with pytest.raises((PackageExpiredError, HTTPException)) as exc_info:
        AppointmentService.book_with_credit(
            db=db_session,
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
            professional_id=sample_professional.id,
            start_time=start_time,
        )
    assert exc_info.value.status_code == 400


def test_book_with_credit_schedule_collision_conflict(
    db_session: Session,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
):
    """Booking fails with 409 Conflict when professional already has an active overlapping appointment."""
    base_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=1, hours=15)

    # First appointment: 15:00 - 15:30
    appt1 = Appointment(
        professional_id=sample_professional.id,
        customer_id=sample_customer_package.customer_id,
        service_id=sample_service.id,
        start_time=base_time,
        end_time=base_time + datetime.timedelta(minutes=30),
        status=AppointmentStatus.BOOKED,
        payment_type=PaymentType.PACKAGE_CREDIT,
    )
    db_session.add(appt1)
    db_session.commit()

    # Attempt overlapping appointment: 15:15 - 15:45
    overlap_time = base_time + datetime.timedelta(minutes=15)

    with pytest.raises((SlotUnavailableError, HTTPException)) as exc_info:
        AppointmentService.book_with_credit(
            db=db_session,
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
            professional_id=sample_professional.id,
            start_time=overlap_time,
        )
    assert exc_info.value.status_code == 409

    # Cancelled appointments should NOT cause collision
    appt1.status = AppointmentStatus.CANCELLED
    db_session.commit()

    appt2 = AppointmentService.book_with_credit(
        db=db_session,
        customer_package_id=sample_customer_package.id,
        service_id=sample_service.id,
        professional_id=sample_professional.id,
        start_time=base_time,
    )
    assert appt2.id is not None


def test_book_with_credit_idempotency(
    db_session: Session,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
):
    """Re-submitting with the same idempotency_key returns existing appointment without double debit."""
    start_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=1, hours=16)
    key = "idem-book-uuid-777"

    appt1 = AppointmentService.book_with_credit(
        db=db_session,
        customer_package_id=sample_customer_package.id,
        service_id=sample_service.id,
        professional_id=sample_professional.id,
        start_time=start_time,
        idempotency_key=key,
    )

    appt2 = AppointmentService.book_with_credit(
        db=db_session,
        customer_package_id=sample_customer_package.id,
        service_id=sample_service.id,
        professional_id=sample_professional.id,
        start_time=start_time,
        idempotency_key=key,
    )

    assert appt1.id == appt2.id

    # Verify balance was decremented only once (4 - 1 = 3)
    balance = (
        db_session.query(CustomerPackageBalance)
        .filter_by(
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
        )
        .one()
    )
    assert balance.remaining_quantity == 3

    # Verify only 1 debit transaction exists with this key
    tx_count = (
        db_session.query(CreditLedgerTransaction)
        .filter_by(idempotency_key=key)
        .count()
    )
    assert tx_count == 1


def test_api_book_with_credit(
    test_client: TestClient,
    sample_customer_package: CustomerPackage,
    sample_professional: Professional,
    sample_service: Service,
    db_session: Session,
):
    """Test API endpoint POST /api/v1/appointments/book-with-credit."""
    start_time = datetime.datetime.now().replace(microsecond=0) + datetime.timedelta(days=1, hours=9)
    payload = {
        "customer_package_id": sample_customer_package.id,
        "service_id": sample_service.id,
        "professional_id": sample_professional.id,
        "start_time": start_time.isoformat(),
        "idempotency_key": "api-book-key-100",
    }

    # 1. Success (201 Created)
    response = test_client.post("/api/v1/appointments/book-with-credit", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["customer_id"] == sample_customer_package.customer_id
    assert data["professional_id"] == sample_professional.id
    assert data["service_id"] == sample_service.id
    assert data["status"] == "BOOKED"
    assert data["payment_type"] == "PACKAGE_CREDIT"
    created_id = data["id"]

    # 2. Idempotent retry returns same appointment
    retry_resp = test_client.post("/api/v1/appointments/book-with-credit", json=payload)
    assert retry_resp.status_code == 201
    assert retry_resp.json()["id"] == created_id

    # 3. Conflict 409 on overlapping time with another key
    conflict_payload = {
        "customer_package_id": sample_customer_package.id,
        "service_id": sample_service.id,
        "professional_id": sample_professional.id,
        "start_time": (start_time + datetime.timedelta(minutes=10)).isoformat(),
        "idempotency_key": "api-book-key-conflict",
    }
    conflict_resp = test_client.post("/api/v1/appointments/book-with-credit", json=conflict_payload)
    assert conflict_resp.status_code == 409

    # 4. Zero balance returns 400
    balance = (
        db_session.query(CustomerPackageBalance)
        .filter_by(
            customer_package_id=sample_customer_package.id,
            service_id=sample_service.id,
        )
        .one()
    )
    balance.remaining_quantity = 0
    db_session.commit()

    zero_payload = {
        "customer_package_id": sample_customer_package.id,
        "service_id": sample_service.id,
        "professional_id": sample_professional.id,
        "start_time": (start_time + datetime.timedelta(days=2)).isoformat(),
    }
    zero_resp = test_client.post("/api/v1/appointments/book-with-credit", json=zero_payload)
    assert zero_resp.status_code == 400
