import datetime
from decimal import Decimal
import pytest
from sqlalchemy import select, exc
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models import (
    BusinessSettings,
    Customer,
    Professional,
    ProfessionalService,
    Service,
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


@pytest.fixture(autouse=True)
def setup_tables(db_session: Session):
    """Ensure all model tables are created in the test engine."""
    Base.metadata.create_all(bind=db_session.get_bind())
    yield


def test_model_exports():
    """Verify all models and enums are properly exported."""
    assert BusinessSettings is not None
    assert Customer is not None
    assert Professional is not None
    assert ProfessionalService is not None
    assert Service is not None
    assert Package is not None
    assert PackageItem is not None
    assert CustomerPackage is not None
    assert CustomerPackageBalance is not None
    assert PackageStatus is not None
    assert Appointment is not None
    assert AppointmentStatus is not None
    assert PaymentType is not None
    assert CreditLedgerTransaction is not None
    assert LedgerTransactionType is not None


def test_business_settings_defaults_and_crud(db_session: Session):
    """Test BusinessSettings model creation and default values."""
    settings = BusinessSettings(
        business_name="Barbearia Estilo",
    )
    db_session.add(settings)
    db_session.commit()
    db_session.refresh(settings)

    assert settings.id is not None
    assert settings.business_name == "Barbearia Estilo"
    assert settings.cancellation_window_hours == 2
    assert settings.default_slot_interval_minutes == 30
    assert settings.open_time == datetime.time(8, 0, 0)
    assert settings.close_time == datetime.time(20, 0, 0)


def test_customer_creation_and_unique_email(db_session: Session):
    """Test Customer creation and uniqueness on email."""
    c1 = Customer(
        name="Carlos Silva",
        phone="11999998888",
        email="carlos@example.com",
        notes="Prefere corte na tesoura",
    )
    db_session.add(c1)
    db_session.commit()
    db_session.refresh(c1)

    assert c1.id is not None
    assert c1.name == "Carlos Silva"

    # Duplicate email should fail
    c2 = Customer(
        name="Carlos Outro",
        phone="11888887777",
        email="carlos@example.com",
    )
    db_session.add(c2)
    with pytest.raises(exc.IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_professional_and_professional_service(db_session: Session):
    """Test Professional, Service and many-to-many ProfessionalService."""
    prof = Professional(name="João Barbeiro", phone="11911112222", is_active=True)
    service = Service(
        name="Corte Tradicional",
        description="Corte de cabelo masculino",
        duration_minutes=30,
        price=Decimal("45.00"),
        is_active=True,
    )
    db_session.add_all([prof, service])
    db_session.commit()

    # Link through ProfessionalService
    prof_service = ProfessionalService(
        professional_id=prof.id,
        service_id=service.id,
        custom_duration_minutes=25,
    )
    db_session.add(prof_service)
    db_session.commit()

    db_session.refresh(prof)
    db_session.refresh(service)

    assert len(prof.services) == 1
    assert prof.services[0].service.name == "Corte Tradicional"
    assert prof.services[0].custom_duration_minutes == 25
    assert len(service.professionals) == 1
    assert service.professionals[0].professional.name == "João Barbeiro"


def test_package_and_package_items(db_session: Session):
    """Test Package catalog and composition with PackageItem."""
    service_corte = Service(name="Corte", duration_minutes=30, price=Decimal("40.00"))
    service_barba = Service(name="Barba", duration_minutes=20, price=Decimal("30.00"))
    db_session.add_all([service_corte, service_barba])
    db_session.commit()

    package = Package(
        name="Combo Mensal",
        description="2 Cortes + 2 Barbas",
        price=Decimal("120.00"),
        validity_days=60,
    )
    package.items.append(PackageItem(service_id=service_corte.id, quantity=2))
    package.items.append(PackageItem(service_id=service_barba.id, quantity=2))

    db_session.add(package)
    db_session.commit()
    db_session.refresh(package)

    assert package.id is not None
    assert package.validity_days == 60
    assert len(package.items) == 2
    assert package.items[0].service.name in ["Corte", "Barba"]


def test_customer_package_and_balances(db_session: Session):
    """Test CustomerPackage purchase wallet and service balances."""
    cust = Customer(name="Ana Maria", phone="11977776666")
    serv = Service(name="Manicure", duration_minutes=45, price=Decimal("35.00"))
    pkg = Package(name="Pacote 4 Manicures", price=Decimal("120.00"), validity_days=90)
    db_session.add_all([cust, serv, pkg])
    db_session.commit()

    expires = datetime.datetime.now() + datetime.timedelta(days=90)
    cp = CustomerPackage(
        customer_id=cust.id,
        package_id=pkg.id,
        status=PackageStatus.ACTIVE,
        expires_at=expires,
    )
    db_session.add(cp)
    db_session.commit()

    balance = CustomerPackageBalance(
        customer_package_id=cp.id,
        service_id=serv.id,
        total_quantity=4,
        remaining_quantity=4,
    )
    db_session.add(balance)
    db_session.commit()
    db_session.refresh(cp)

    assert cp.customer.name == "Ana Maria"
    assert len(cp.balances) == 1
    assert cp.balances[0].remaining_quantity == 4
    assert cp.balances[0].service.name == "Manicure"


def test_customer_package_balance_check_constraint(db_session: Session):
    """Test that CustomerPackageBalance rejects negative remaining_quantity."""
    cust = Customer(name="Lucas", phone="11955554444")
    serv = Service(name="Cabelo", duration_minutes=30, price=Decimal("50.00"))
    pkg = Package(name="Pacote Cabelo", price=Decimal("100.00"), validity_days=30)
    db_session.add_all([cust, serv, pkg])
    db_session.commit()

    cp = CustomerPackage(
        customer_id=cust.id,
        package_id=pkg.id,
        status=PackageStatus.ACTIVE,
        expires_at=datetime.datetime.now() + datetime.timedelta(days=30),
    )
    db_session.add(cp)
    db_session.commit()

    # Attempting remaining_quantity < 0 should violate chk_remaining_positive
    neg_balance = CustomerPackageBalance(
        customer_package_id=cp.id,
        service_id=serv.id,
        total_quantity=4,
        remaining_quantity=-1,
    )
    db_session.add(neg_balance)
    with pytest.raises(exc.IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_appointment_and_credit_ledger_transactions(db_session: Session):
    """Test Appointment and CreditLedgerTransaction relationships and idempotency key."""
    cust = Customer(name="Beatriz", phone="11944443333")
    prof = Professional(name="Marcos", phone="11933332222")
    serv = Service(name="Coloração", duration_minutes=60, price=Decimal("150.00"))
    pkg = Package(name="Pacote Coloração", price=Decimal("400.00"), validity_days=60)
    db_session.add_all([cust, prof, serv, pkg])
    db_session.commit()

    cp = CustomerPackage(
        customer_id=cust.id,
        package_id=pkg.id,
        status=PackageStatus.ACTIVE,
        expires_at=datetime.datetime.now() + datetime.timedelta(days=60),
    )
    db_session.add(cp)
    db_session.commit()

    now = datetime.datetime.now()
    appt = Appointment(
        professional_id=prof.id,
        customer_id=cust.id,
        service_id=serv.id,
        start_time=now + datetime.timedelta(days=1),
        end_time=now + datetime.timedelta(days=1, minutes=60),
        status=AppointmentStatus.BOOKED,
        payment_type=PaymentType.PACKAGE_CREDIT,
    )
    db_session.add(appt)
    db_session.commit()

    # Credit Ledger Transaction for debit booking
    tx = CreditLedgerTransaction(
        customer_package_id=cp.id,
        service_id=serv.id,
        appointment_id=appt.id,
        type=LedgerTransactionType.DEBIT_BOOKING,
        amount=-1,
        balance_after=2,
        idempotency_key="tx-uuid-12345",
        notes="Agendamento #1 com crédito do pacote",
    )
    db_session.add(tx)
    db_session.commit()
    db_session.refresh(appt)
    db_session.refresh(tx)

    assert len(appt.transactions) == 1
    assert appt.transactions[0].idempotency_key == "tx-uuid-12345"
    assert appt.transactions[0].amount == -1
    assert appt.transactions[0].type == LedgerTransactionType.DEBIT_BOOKING
    assert tx.customer_package.id == cp.id
    assert tx.appointment.id == appt.id

    # Duplicate idempotency_key should raise IntegrityError
    dup_tx = CreditLedgerTransaction(
        customer_package_id=cp.id,
        service_id=serv.id,
        appointment_id=appt.id,
        type=LedgerTransactionType.DEBIT_BOOKING,
        amount=-1,
        balance_after=1,
        idempotency_key="tx-uuid-12345",
    )
    db_session.add(dup_tx)
    with pytest.raises(exc.IntegrityError):
        db_session.commit()
    db_session.rollback()
