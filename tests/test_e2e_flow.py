import datetime
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.core.security import hash_pin, DEFAULT_ADMIN_PIN
from app.models import (
    Customer,
    Professional,
    Service,
    ProfessionalService,
    Package,
    PackageItem,
    CustomerPackage,
    CustomerPackageBalance,
    Appointment,
    AppointmentStatus,
    CreditLedgerTransaction,
    LedgerTransactionType,
    BusinessSettings,
)


@pytest.fixture
def client(db_session: Session) -> TestClient:
    """TestClient using the isolated in-memory test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def setup_e2e_entities(db_session: Session):
    """Seed initial database state with customer, professional, service, and promotional package."""
    # Ensure business settings exist
    settings = db_session.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(
            business_name="SoftBarber Premium",
            admin_pin_hash=hash_pin(DEFAULT_ADMIN_PIN),
            cancellation_window_hours=2,
            default_slot_interval_minutes=30,
            open_time=datetime.time(8, 0),
            close_time=datetime.time(20, 0),
        )
        db_session.add(settings)
        db_session.commit()
    elif not settings.admin_pin_hash:
        settings.admin_pin_hash = hash_pin(DEFAULT_ADMIN_PIN)
        db_session.commit()

    # 1. Customer
    customer = Customer(
        name="Gabriel Santos",
        phone="11999990001",
        email="gabriel.santos@example.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    # 2. Service (Corte Masculino Degradê - 30 min)
    service = Service(
        name="Corte Masculino Degradê",
        description="Corte de cabelo com finalização e lavagem",
        duration_minutes=30,
        price=Decimal("50.00"),
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)

    # 3. Professional
    professional = Professional(
        name="Lucas Barbeiro",
        phone="11988880002",
        is_active=True,
    )
    db_session.add(professional)
    db_session.commit()
    db_session.refresh(professional)

    # 4. Professional habilitated for Service
    prof_service = ProfessionalService(
        professional_id=professional.id,
        service_id=service.id,
    )
    db_session.add(prof_service)
    db_session.commit()

    # 5. Package Catalog (Pacote 4 Cortes - R$ 160.00)
    package = Package(
        name="Combo Mensal 4 Cortes",
        description="4 cortes masculinos válidos por 60 dias",
        price=Decimal("160.00"),
        validity_days=60,
        is_active=True,
    )
    db_session.add(package)
    db_session.commit()
    db_session.refresh(package)

    # Package composition (4 items of service)
    item = PackageItem(
        package_id=package.id,
        service_id=service.id,
        quantity=4,
    )
    db_session.add(item)
    db_session.commit()

    return {
        "customer": customer,
        "professional": professional,
        "service": service,
        "package": package,
    }


def test_app_health_check(client: TestClient):
    """Verify GET /health returns OK status and CORS configuration allows requests."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "ok")
    assert "version" in data


def test_app_cors_headers(client: TestClient):
    """Verify CORS middleware headers are present on requests with Origin header."""
    response = client.options(
        "/api/v1/packages/purchase",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ("*", "http://localhost:3000")


def test_complete_e2e_user_journey(client: TestClient, setup_e2e_entities: dict, db_session: Session):
    """
    End-to-End user journey validation under authentication and security model:
    0. Admin Authentication -> login with PIN, obtain JWT token, execute protected admin operation.
    0.5. Customer Authentication -> login with phone, obtain JWT token, verify profile via /me.
    1. Purchase package -> verify 201 with auth headers and initial balance (+4).
    2. Query customer packages -> verify 4 credits available using customer auth headers.
    3. Query available slots -> verify slots generated and choose one.
    4. Book appointment with credit -> verify 201 with auth headers, slot reserved, balance reduced to 3.
    5. Verify chosen slot is removed from available schedule.
    6. Cancel appointment within window -> verify 200 with auth headers and balance restored to 4.
    7. Verify slot restored to available schedule.
    8. Re-book appointment with restored credit -> verify 201, slot reserved again, balance reduced to 3.
    9. Verify audit ledger contains exactly 4 entries:
       PURCHASE (+4), DEBIT_BOOKING (-1), REFUND_CANCELLATION (+1), DEBIT_BOOKING (-1), with exact math.
    10. Verify idempotency on purchase and booking endpoints.
    """
    customer = setup_e2e_entities["customer"]
    professional = setup_e2e_entities["professional"]
    service = setup_e2e_entities["service"]
    pkg = setup_e2e_entities["package"]

    # -------------------------------------------------------------------------
    # STEP 0: Admin Authentication via POST /api/v1/auth/admin/login
    # -------------------------------------------------------------------------
    resp_admin = client.post("/api/v1/auth/admin/login", json={"pin": DEFAULT_ADMIN_PIN})
    assert resp_admin.status_code == 200
    admin_data = resp_admin.json()
    assert admin_data["role"] == "admin"
    assert "access_token" in admin_data
    admin_token = admin_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Verify protected admin operation (change PIN and change back)
    resp_change_pin = client.post(
        "/api/v1/auth/admin/change-pin",
        json={"old_pin": "1234", "new_pin": "9876"},
        headers=admin_headers,
    )
    assert resp_change_pin.status_code == 200

    # Re-login with new PIN and revert to default 1234
    resp_admin_new = client.post("/api/v1/auth/admin/login", json={"pin": "9876"})
    assert resp_admin_new.status_code == 200
    new_admin_token = resp_admin_new.json()["access_token"]
    resp_revert_pin = client.post(
        "/api/v1/auth/admin/change-pin",
        json={"old_pin": "9876", "new_pin": "1234"},
        headers={"Authorization": f"Bearer {new_admin_token}"},
    )
    assert resp_revert_pin.status_code == 200

    # -------------------------------------------------------------------------
    # STEP 0.5: Customer Authentication via POST /api/v1/auth/customer/login
    # -------------------------------------------------------------------------
    resp_cust = client.post(
        "/api/v1/auth/customer/login",
        json={"phone": customer.phone, "name": customer.name},
    )
    assert resp_cust.status_code == 200
    cust_data = resp_cust.json()
    assert cust_data["role"] == "customer"
    assert cust_data["customer"]["id"] == customer.id
    customer_token = cust_data["access_token"]
    customer_headers = {"Authorization": f"Bearer {customer_token}"}

    # Verify /api/v1/auth/customer/me profile endpoint
    resp_me = client.get("/api/v1/auth/customer/me", headers=customer_headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["id"] == customer.id
    assert resp_me.json()["name"] == customer.name

    # -------------------------------------------------------------------------
    # STEP 1: Purchase Package via POST /api/v1/packages/purchase
    # -------------------------------------------------------------------------
    purchase_payload = {
        "customer_id": customer.id,
        "package_id": pkg.id,
        "idempotency_key": "e2e-purchase-key-001",
    }
    resp_purchase = client.post(
        "/api/v1/packages/purchase",
        json=purchase_payload,
        headers=customer_headers,
    )
    assert resp_purchase.status_code == 201
    purchase_data = resp_purchase.json()
    customer_package_id = purchase_data["id"]

    assert purchase_data["customer_id"] == customer.id
    assert purchase_data["package_id"] == pkg.id
    assert purchase_data["status"] == "ACTIVE"
    assert len(purchase_data["balances"]) == 1
    assert purchase_data["balances"][0]["service_id"] == service.id
    assert purchase_data["balances"][0]["total_quantity"] == 4
    assert purchase_data["balances"][0]["remaining_quantity"] == 4

    # Test purchase idempotency
    retry_purchase = client.post(
        "/api/v1/packages/purchase",
        json=purchase_payload,
        headers=customer_headers,
    )
    assert retry_purchase.status_code == 201
    assert retry_purchase.json()["id"] == customer_package_id

    # -------------------------------------------------------------------------
    # STEP 2: Query Customer Packages via GET /api/v1/customers/{id}/packages
    # -------------------------------------------------------------------------
    resp_packages = client.get(
        f"/api/v1/customers/{customer.id}/packages",
        headers=customer_headers,
    )
    assert resp_packages.status_code == 200
    pkgs_data = resp_packages.json()
    assert len(pkgs_data) == 1
    assert pkgs_data[0]["id"] == customer_package_id
    assert pkgs_data[0]["balances"][0]["remaining_quantity"] == 4

    # -------------------------------------------------------------------------
    # STEP 3: Query Available Slots via GET /api/v1/professionals/{id}/available-slots
    # -------------------------------------------------------------------------
    target_date = datetime.date.today() + datetime.timedelta(days=2)
    resp_slots = client.get(
        f"/api/v1/professionals/{professional.id}/available-slots",
        params={"service_id": service.id, "date": target_date.isoformat()},
    )
    assert resp_slots.status_code == 200
    slots_data = resp_slots.json()
    assert slots_data["professional_id"] == professional.id
    assert slots_data["service_id"] == service.id
    assert len(slots_data["slots"]) == 24  # 08:00 to 20:00 (12 hours / 30 min)

    # Pick the 10:00:00 slot
    chosen_slot = slots_data["slots"][4]  # 08:00, 08:30, 09:00, 09:30, 10:00
    chosen_start_time = chosen_slot["start_time"]
    chosen_end_time = chosen_slot["end_time"]
    assert "10:00:00" in chosen_start_time

    # -------------------------------------------------------------------------
    # STEP 4: Book Appointment with Credit via POST /api/v1/appointments/book-with-credit
    # -------------------------------------------------------------------------
    book_payload = {
        "customer_package_id": customer_package_id,
        "service_id": service.id,
        "professional_id": professional.id,
        "start_time": chosen_start_time,
        "idempotency_key": "e2e-book-key-001",
    }
    resp_book = client.post(
        "/api/v1/appointments/book-with-credit",
        json=book_payload,
        headers=customer_headers,
    )
    assert resp_book.status_code == 201
    book_data = resp_book.json()
    appointment_id = book_data["id"]

    assert book_data["status"] == "BOOKED"
    assert book_data["payment_type"] == "PACKAGE_CREDIT"
    assert book_data["professional_id"] == professional.id
    assert book_data["customer_id"] == customer.id
    assert book_data["service_id"] == service.id

    # Test booking idempotency
    retry_book = client.post(
        "/api/v1/appointments/book-with-credit",
        json=book_payload,
        headers=customer_headers,
    )
    assert retry_book.status_code == 201
    assert retry_book.json()["id"] == appointment_id

    # -------------------------------------------------------------------------
    # STEP 5: Verify Balance Decremented to 3
    # -------------------------------------------------------------------------
    resp_bal_after_book = client.get(
        f"/api/v1/customers/{customer.id}/packages",
        headers=customer_headers,
    )
    assert resp_bal_after_book.status_code == 200
    bal_after_book_data = resp_bal_after_book.json()
    assert bal_after_book_data[0]["balances"][0]["remaining_quantity"] == 3

    # -------------------------------------------------------------------------
    # STEP 6: Verify Chosen Slot is Removed from Available Schedule
    # -------------------------------------------------------------------------
    resp_slots_after_book = client.get(
        f"/api/v1/professionals/{professional.id}/available-slots",
        params={"service_id": service.id, "date": target_date.isoformat()},
    )
    assert resp_slots_after_book.status_code == 200
    slots_after_book = resp_slots_after_book.json()["slots"]
    assert len(slots_after_book) == 23
    available_start_times = [s["start_time"] for s in slots_after_book]
    assert chosen_start_time not in available_start_times

    # -------------------------------------------------------------------------
    # STEP 7: Cancel Appointment via POST /api/v1/appointments/{id}/cancel
    # -------------------------------------------------------------------------
    cancel_payload = {
        "cancellation_reason": "Cliente solicitou reagendamento com antecedência de 2 dias",
    }
    resp_cancel = client.post(
        f"/api/v1/appointments/{appointment_id}/cancel",
        json=cancel_payload,
        headers=customer_headers,
    )
    assert resp_cancel.status_code == 200
    cancel_data = resp_cancel.json()
    assert cancel_data["id"] == appointment_id
    assert cancel_data["status"] == "CANCELLED"
    assert cancel_data["cancellation_reason"] == cancel_payload["cancellation_reason"]
    assert cancel_data["cancelled_at"] is not None

    # -------------------------------------------------------------------------
    # STEP 8: Verify Balance Restored to 4 and Slot Reopened in Schedule
    # -------------------------------------------------------------------------
    resp_bal_after_cancel = client.get(
        f"/api/v1/customers/{customer.id}/packages",
        headers=customer_headers,
    )
    assert resp_bal_after_cancel.status_code == 200
    bal_after_cancel_data = resp_bal_after_cancel.json()
    assert bal_after_cancel_data[0]["balances"][0]["remaining_quantity"] == 4

    # Verify slot reopened
    resp_slots_after_cancel = client.get(
        f"/api/v1/professionals/{professional.id}/available-slots",
        params={"service_id": service.id, "date": target_date.isoformat()},
    )
    assert resp_slots_after_cancel.status_code == 200
    slots_after_cancel = resp_slots_after_cancel.json()["slots"]
    assert len(slots_after_cancel) == 24
    available_start_times_after = [s["start_time"] for s in slots_after_cancel]
    assert chosen_start_time in available_start_times_after

    # -------------------------------------------------------------------------
    # STEP 8.5: Re-book Appointment with Restored Credit
    # -------------------------------------------------------------------------
    rebook_payload = {
        "customer_package_id": customer_package_id,
        "service_id": service.id,
        "professional_id": professional.id,
        "start_time": chosen_start_time,
        "idempotency_key": "e2e-rebook-key-002",
    }
    resp_rebook = client.post(
        "/api/v1/appointments/book-with-credit",
        json=rebook_payload,
        headers=customer_headers,
    )
    assert resp_rebook.status_code == 201
    rebook_data = resp_rebook.json()
    rebooked_appointment_id = rebook_data["id"]
    assert rebook_data["status"] == "BOOKED"
    assert rebook_data["payment_type"] == "PACKAGE_CREDIT"

    # Verify balance decremented to 3 again
    resp_bal_after_rebook = client.get(
        f"/api/v1/customers/{customer.id}/packages",
        headers=customer_headers,
    )
    assert resp_bal_after_rebook.status_code == 200
    assert resp_bal_after_rebook.json()[0]["balances"][0]["remaining_quantity"] == 3

    # Verify chosen slot removed again from schedule
    resp_slots_after_rebook = client.get(
        f"/api/v1/professionals/{professional.id}/available-slots",
        params={"service_id": service.id, "date": target_date.isoformat()},
    )
    assert resp_slots_after_rebook.status_code == 200
    assert chosen_start_time not in [s["start_time"] for s in resp_slots_after_rebook.json()["slots"]]

    # -------------------------------------------------------------------------
    # STEP 9: Verify Immutable Audit Ledger in Database
    # -------------------------------------------------------------------------
    # Query all ledger transactions for this customer_package
    transactions = (
        db_session.query(CreditLedgerTransaction)
        .filter_by(customer_package_id=customer_package_id)
        .order_by(CreditLedgerTransaction.id.asc())
        .all()
    )

    # Must contain exactly 4 transactions: PURCHASE, DEBIT_BOOKING, REFUND_CANCELLATION, DEBIT_BOOKING
    assert len(transactions) == 4

    # 1. PURCHASE
    tx_purchase = transactions[0]
    assert tx_purchase.type == LedgerTransactionType.PURCHASE
    assert tx_purchase.amount == 4
    assert tx_purchase.balance_after == 4
    assert tx_purchase.service_id == service.id
    assert tx_purchase.appointment_id is None
    assert tx_purchase.idempotency_key == "e2e-purchase-key-001"

    # 2. DEBIT_BOOKING
    tx_debit = transactions[1]
    assert tx_debit.type == LedgerTransactionType.DEBIT_BOOKING
    assert tx_debit.amount == -1
    assert tx_debit.balance_after == 3
    assert tx_debit.service_id == service.id
    assert tx_debit.appointment_id == appointment_id
    assert tx_debit.idempotency_key == "e2e-book-key-001"

    # 3. REFUND_CANCELLATION
    tx_refund = transactions[2]
    assert tx_refund.type == LedgerTransactionType.REFUND_CANCELLATION
    assert tx_refund.amount == 1
    assert tx_refund.balance_after == 4
    assert tx_refund.service_id == service.id
    assert tx_refund.appointment_id == appointment_id

    # 4. DEBIT_BOOKING (Re-booking)
    tx_rebook = transactions[3]
    assert tx_rebook.type == LedgerTransactionType.DEBIT_BOOKING
    assert tx_rebook.amount == -1
    assert tx_rebook.balance_after == 3
    assert tx_rebook.service_id == service.id
    assert tx_rebook.appointment_id == rebooked_appointment_id
    assert tx_rebook.idempotency_key == "e2e-rebook-key-002"

    # Verify ledger mathematical consistency:
    total_ledger_balance = sum(tx.amount for tx in transactions)
    assert total_ledger_balance == 3


def test_e2e_security_boundary_enforcement(client: TestClient, setup_e2e_entities: dict):
    """
    Verify security boundary enforcement across the API:
    1. Unauthenticated requests to admin routes return 401.
    2. Customer token accessing admin routes returns 403 Forbidden.
    3. Unauthenticated requests to customer profile route return 401.
    4. Admin token accessing customer profile route returns 403 Forbidden.
    """
    customer = setup_e2e_entities["customer"]

    # 1. Admin login & token
    admin_res = client.post("/api/v1/auth/admin/login", json={"pin": DEFAULT_ADMIN_PIN})
    assert admin_res.status_code == 200
    admin_token = admin_res.json()["access_token"]

    # 2. Customer login & token
    cust_res = client.post("/api/v1/auth/customer/login", json={"phone": customer.phone})
    assert cust_res.status_code == 200
    cust_token = cust_res.json()["access_token"]

    # 3. Admin change PIN without token -> 401
    r_no_auth = client.post("/api/v1/auth/admin/change-pin", json={"old_pin": "1234", "new_pin": "0000"})
    assert r_no_auth.status_code == 401

    # 4. Admin change PIN with customer token -> 403
    r_cust_to_admin = client.post(
        "/api/v1/auth/admin/change-pin",
        json={"old_pin": "1234", "new_pin": "0000"},
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert r_cust_to_admin.status_code == 403

    # 5. Customer me without token -> 401
    r_me_no_auth = client.get("/api/v1/auth/customer/me")
    assert r_me_no_auth.status_code == 401

    # 6. Customer me with admin token -> 403
    r_me_admin = client.get(
        "/api/v1/auth/customer/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r_me_admin.status_code == 403
