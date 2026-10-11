import datetime
from decimal import Decimal
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Customer,
    Service,
    Package,
    PackageItem,
    CustomerPackage,
    CustomerPackageBalance,
    PackageStatus,
    CreditLedgerTransaction,
    LedgerTransactionType,
)
from app.core.database import get_db

# We will import these from the implementation to be created
from app.schemas.package import (
    PackagePurchaseRequest,
    CustomerPackageResponse,
    CustomerPackageBalanceResponse,
)
from app.services.package_service import (
    PackageService,
    CustomerNotFoundError,
    PackageNotFoundError,
    PackageInactiveError,
)
from app.api.v1.packages import router as packages_router


@pytest.fixture
def sample_customer(db_session: Session) -> Customer:
    customer = Customer(
        name="Carlos Silva",
        phone="11988887777",
        email="carlos@example.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def single_item_package(db_session: Session) -> Package:
    service = Service(
        name="Corte Masculino",
        description="Corte de cabelo tradicional",
        duration_minutes=30,
        price=Decimal("40.00"),
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()

    pkg = Package(
        name="Pacote 4 Cortes",
        description="4 cortes com desconto",
        price=Decimal("130.00"),
        validity_days=60,
        is_active=True,
    )
    pkg.items.append(PackageItem(service_id=service.id, quantity=4))
    db_session.add(pkg)
    db_session.commit()
    db_session.refresh(pkg)
    return pkg


@pytest.fixture
def multi_item_package(db_session: Session) -> Package:
    service_corte = Service(
        name="Corte Completo",
        duration_minutes=30,
        price=Decimal("45.00"),
        is_active=True,
    )
    service_barba = Service(
        name="Barba Terapia",
        duration_minutes=25,
        price=Decimal("35.00"),
        is_active=True,
    )
    db_session.add_all([service_corte, service_barba])
    db_session.commit()

    pkg = Package(
        name="Combo Barba e Cabelo",
        description="3 Cortes + 2 Barbas",
        price=Decimal("170.00"),
        validity_days=90,
        is_active=True,
    )
    pkg.items.append(PackageItem(service_id=service_corte.id, quantity=3))
    pkg.items.append(PackageItem(service_id=service_barba.id, quantity=2))
    db_session.add(pkg)
    db_session.commit()
    db_session.refresh(pkg)
    return pkg


@pytest.fixture
def test_client(db_session: Session) -> TestClient:
    app = FastAPI()
    app.include_router(packages_router, prefix="/api/v1")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_purchase_package_single_item(
    db_session: Session, sample_customer: Customer, single_item_package: Package
):
    """Test successful purchase of a package with 1 item and verified ledger."""
    customer_package = PackageService.purchase_package(
        db=db_session,
        customer_id=sample_customer.id,
        package_id=single_item_package.id,
    )

    assert customer_package.id is not None
    assert customer_package.customer_id == sample_customer.id
    assert customer_package.package_id == single_item_package.id
    assert customer_package.status == PackageStatus.ACTIVE
    assert customer_package.expires_at > customer_package.purchased_at

    expected_expiry = customer_package.purchased_at + datetime.timedelta(
        days=single_item_package.validity_days
    )
    assert abs((customer_package.expires_at - expected_expiry).total_seconds()) < 5

    # Verify balance
    assert len(customer_package.balances) == 1
    balance = customer_package.balances[0]
    assert balance.total_quantity == 4
    assert balance.remaining_quantity == 4

    # Verify ledger transactions
    transactions = (
        db_session.query(CreditLedgerTransaction)
        .filter_by(customer_package_id=customer_package.id)
        .all()
    )
    assert len(transactions) == 1
    tx = transactions[0]
    assert tx.type == LedgerTransactionType.PURCHASE
    assert tx.amount == 4
    assert tx.balance_after == 4
    assert tx.service_id == single_item_package.items[0].service_id
    assert tx.appointment_id is None


def test_purchase_package_multi_item(
    db_session: Session, sample_customer: Customer, multi_item_package: Package
):
    """Test successful purchase of a multi-item package and verify balances and ledger."""
    customer_package = PackageService.purchase_package(
        db=db_session,
        customer_id=sample_customer.id,
        package_id=multi_item_package.id,
    )

    assert len(customer_package.balances) == 2
    corte_item = [i for i in multi_item_package.items if i.quantity == 3][0]
    barba_item = [i for i in multi_item_package.items if i.quantity == 2][0]

    bal_corte = [b for b in customer_package.balances if b.service_id == corte_item.service_id][0]
    bal_barba = [b for b in customer_package.balances if b.service_id == barba_item.service_id][0]

    assert bal_corte.total_quantity == 3
    assert bal_corte.remaining_quantity == 3
    assert bal_barba.total_quantity == 2
    assert bal_barba.remaining_quantity == 2

    # Verify ledger
    transactions = (
        db_session.query(CreditLedgerTransaction)
        .filter_by(customer_package_id=customer_package.id)
        .order_by(CreditLedgerTransaction.id.asc())
        .all()
    )
    assert len(transactions) == 2
    assert all(t.type == LedgerTransactionType.PURCHASE for t in transactions)
    tx_corte = [t for t in transactions if t.service_id == corte_item.service_id][0]
    tx_barba = [t for t in transactions if t.service_id == barba_item.service_id][0]
    assert tx_corte.amount == 3
    assert tx_corte.balance_after == 3
    assert tx_barba.amount == 2
    assert tx_barba.balance_after == 2


def test_purchase_package_idempotency(
    db_session: Session, sample_customer: Customer, single_item_package: Package
):
    """Calling purchase with the same idempotency_key twice returns the same package without duplicate records."""
    key = "unique-order-uuid-1234"

    pkg1 = PackageService.purchase_package(
        db=db_session,
        customer_id=sample_customer.id,
        package_id=single_item_package.id,
        idempotency_key=key,
    )

    pkg2 = PackageService.purchase_package(
        db=db_session,
        customer_id=sample_customer.id,
        package_id=single_item_package.id,
        idempotency_key=key,
    )

    assert pkg1.id == pkg2.id

    # Verify no duplicate customer_packages
    total_packages = (
        db_session.query(CustomerPackage)
        .filter_by(customer_id=sample_customer.id, package_id=single_item_package.id)
        .count()
    )
    assert total_packages == 1

    # Verify no duplicate transactions
    total_tx = (
        db_session.query(CreditLedgerTransaction)
        .filter_by(customer_package_id=pkg1.id)
        .count()
    )
    assert total_tx == 1


def test_purchase_package_validation_errors(
    db_session: Session, sample_customer: Customer, single_item_package: Package
):
    """Test validation errors for non-existent customer, non-existent package, and inactive package."""
    # Non-existent customer
    with pytest.raises((CustomerNotFoundError, HTTPException)) as exc_info:
        PackageService.purchase_package(
            db=db_session,
            customer_id=99999,
            package_id=single_item_package.id,
        )
    if isinstance(exc_info.value, HTTPException):
        assert exc_info.value.status_code == 404

    # Non-existent package
    with pytest.raises((PackageNotFoundError, HTTPException)) as exc_info:
        PackageService.purchase_package(
            db=db_session,
            customer_id=sample_customer.id,
            package_id=88888,
        )
    if isinstance(exc_info.value, HTTPException):
        assert exc_info.value.status_code == 404

    # Inactive package
    single_item_package.is_active = False
    db_session.commit()

    with pytest.raises((PackageInactiveError, HTTPException)) as exc_info:
        PackageService.purchase_package(
            db=db_session,
            customer_id=sample_customer.id,
            package_id=single_item_package.id,
        )
    if isinstance(exc_info.value, HTTPException):
        assert exc_info.value.status_code == 400


def test_get_customer_packages_with_lazy_expiration(
    db_session: Session, sample_customer: Customer, single_item_package: Package
):
    """Test listing customer packages and verify that past-due package transitions to EXPIRED."""
    # Active package
    active_cp = PackageService.purchase_package(
        db=db_session,
        customer_id=sample_customer.id,
        package_id=single_item_package.id,
    )

    # Package expired yesterday
    expired_cp = CustomerPackage(
        customer_id=sample_customer.id,
        package_id=single_item_package.id,
        status=PackageStatus.ACTIVE,
        purchased_at=datetime.datetime.now() - datetime.timedelta(days=10),
        expires_at=datetime.datetime.now() - datetime.timedelta(days=1),
    )
    db_session.add(expired_cp)
    db_session.commit()

    # Query customer packages
    packages = PackageService.get_customer_packages(
        db=db_session,
        customer_id=sample_customer.id,
    )

    assert len(packages) == 2
    pkg_by_id = {p.id: p for p in packages}

    assert pkg_by_id[active_cp.id].status == PackageStatus.ACTIVE
    assert pkg_by_id[expired_cp.id].status == PackageStatus.EXPIRED

    # Verify persistence in DB
    db_session.refresh(expired_cp)
    assert expired_cp.status == PackageStatus.EXPIRED


def test_api_purchase_and_list_packages(
    test_client: TestClient, sample_customer: Customer, single_item_package: Package
):
    """Test API endpoints for purchase and customer package listing."""
    # POST /api/v1/packages/purchase
    payload = {
        "customer_id": sample_customer.id,
        "package_id": single_item_package.id,
        "idempotency_key": "api-idem-key-999",
    }
    response = test_client.post("/api/v1/packages/purchase", json=payload)
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["customer_id"] == sample_customer.id
    assert data["package_id"] == single_item_package.id
    assert data["status"] == "ACTIVE"
    assert len(data["balances"]) == 1
    assert data["balances"][0]["remaining_quantity"] == 4
    created_id = data["id"]

    # Test idempotency through API
    response_retry = test_client.post("/api/v1/packages/purchase", json=payload)
    assert response_retry.status_code in [200, 201]
    assert response_retry.json()["id"] == created_id

    # GET /api/v1/customers/{customer_id}/packages
    list_response = test_client.get(f"/api/v1/customers/{sample_customer.id}/packages")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data) == 1
    assert list_data[0]["id"] == created_id
    assert list_data[0]["balances"][0]["remaining_quantity"] == 4


def test_api_purchase_validation_errors(
    test_client: TestClient, sample_customer: Customer, single_item_package: Package, db_session: Session
):
    """Test API error handling for 404 and 400 cases."""
    # 404 Customer not found
    resp = test_client.post(
        "/api/v1/packages/purchase",
        json={"customer_id": 9999, "package_id": single_item_package.id},
    )
    assert resp.status_code == 404

    # 404 Package not found
    resp = test_client.post(
        "/api/v1/packages/purchase",
        json={"customer_id": sample_customer.id, "package_id": 9999},
    )
    assert resp.status_code == 404

    # 400 Inactive package
    single_item_package.is_active = False
    db_session.commit()
    resp = test_client.post(
        "/api/v1/packages/purchase",
        json={"customer_id": sample_customer.id, "package_id": single_item_package.id},
    )
    assert resp.status_code == 400

    # 404 GET customer packages for non-existent customer
    resp = test_client.get("/api/v1/customers/9999/packages")
    assert resp.status_code == 404
