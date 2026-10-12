import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.core.security import decode_access_token, hash_pin, DEFAULT_ADMIN_PIN
from app.models.customer import Customer
from app.models.business_settings import BusinessSettings


@pytest.fixture
def client(db_session: Session) -> TestClient:
    """FastAPI TestClient with isolated db_session override."""
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
def default_business_settings(db_session: Session) -> BusinessSettings:
    """Ensure business settings exist in the database with default PIN '1234'."""
    settings = db_session.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(
            business_name="SoftBarber Test",
            admin_pin_hash=hash_pin(DEFAULT_ADMIN_PIN),
        )
        db_session.add(settings)
        db_session.commit()
        db_session.refresh(settings)
    return settings


# ==============================================================================
# 1. Admin Authentication Tests
# ==============================================================================

def test_admin_login_success(client: TestClient, default_business_settings: BusinessSettings):
    """POST /api/v1/auth/admin/login with correct PIN returns 200 and valid JWT token."""
    response = client.post("/api/v1/auth/admin/login", json={"pin": "1234"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "admin"
    assert data["expires_in"] == 12 * 3600

    payload = decode_access_token(data["access_token"])
    assert payload["sub"] == "admin"
    assert payload["role"] == "admin"


def test_admin_login_invalid_pin(client: TestClient, default_business_settings: BusinessSettings):
    """POST /api/v1/auth/admin/login with incorrect PIN returns 401 Unauthorized."""
    response = client.post("/api/v1/auth/admin/login", json={"pin": "9999"})
    assert response.status_code == 401
    assert response.json()["detail"] == "PIN de acesso incorreto"


def test_admin_login_validation_error(client: TestClient):
    """POST /api/v1/auth/admin/login with invalid PIN length returns 422."""
    # PIN too short (< 4 chars)
    res_short = client.post("/api/v1/auth/admin/login", json={"pin": "12"})
    assert res_short.status_code == 422

    # PIN too long (> 8 chars)
    res_long = client.post("/api/v1/auth/admin/login", json={"pin": "123456789"})
    assert res_long.status_code == 422


def test_admin_change_pin_unauthorized(client: TestClient):
    """POST /api/v1/auth/admin/change-pin without authentication returns 401."""
    response = client.post(
        "/api/v1/auth/admin/change-pin",
        json={"old_pin": "1234", "new_pin": "5678"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Token de autenticação não fornecido"


def test_admin_change_pin_forbidden_for_customer(client: TestClient, db_session: Session):
    """POST /api/v1/auth/admin/change-pin with customer token returns 403 Forbidden."""
    # Create customer & login
    customer = Customer(name="Cliente Comum", phone="11988880000")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    cust_login_res = client.post(
        "/api/v1/auth/customer/login",
        json={"phone": "11988880000"},
    )
    cust_token = cust_login_res.json()["access_token"]

    response = client.post(
        "/api/v1/auth/admin/change-pin",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"old_pin": "1234", "new_pin": "5678"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Acesso restrito ao administrador"


def test_admin_change_pin_wrong_old_pin(client: TestClient, default_business_settings: BusinessSettings):
    """POST /api/v1/auth/admin/change-pin with wrong old_pin returns 400 Bad Request."""
    login_res = client.post("/api/v1/auth/admin/login", json={"pin": "1234"})
    admin_token = login_res.json()["access_token"]

    response = client.post(
        "/api/v1/auth/admin/change-pin",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"old_pin": "0000", "new_pin": "5678"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "PIN atual incorreto"


def test_admin_change_pin_success_flow(client: TestClient, default_business_settings: BusinessSettings):
    """Admin successfully changes PIN, old PIN is invalidated, and new PIN is required."""
    # 1. Login with original PIN "1234"
    login_res = client.post("/api/v1/auth/admin/login", json={"pin": "1234"})
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]

    # 2. Change PIN to "8888"
    change_res = client.post(
        "/api/v1/auth/admin/change-pin",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"old_pin": "1234", "new_pin": "8888"},
    )
    assert change_res.status_code == 200
    assert change_res.json()["message"] == "PIN administrativo alterado com sucesso"

    # 3. Old PIN "1234" now fails
    old_login_res = client.post("/api/v1/auth/admin/login", json={"pin": "1234"})
    assert old_login_res.status_code == 401
    assert old_login_res.json()["detail"] == "PIN de acesso incorreto"

    # 4. New PIN "8888" succeeds
    new_login_res = client.post("/api/v1/auth/admin/login", json={"pin": "8888"})
    assert new_login_res.status_code == 200
    assert "access_token" in new_login_res.json()


# ==============================================================================
# 2. Customer Authentication Tests
# ==============================================================================

def test_customer_login_existing_user(client: TestClient, db_session: Session):
    """POST /api/v1/auth/customer/login with existing phone returns customer without duplicate."""
    customer = Customer(
        name="Lucas Barbeiro",
        phone="11977771111",
        email="lucas@exemplo.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    total_customers_before = db_session.query(Customer).count()

    response = client.post(
        "/api/v1/auth/customer/login",
        json={"phone": "11977771111"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "customer"
    assert data["token_type"] == "bearer"
    assert "access_token" in data
    assert data["customer"]["id"] == customer.id
    assert data["customer"]["name"] == "Lucas Barbeiro"
    assert data["customer"]["phone"] == "11977771111"

    # Ensure no duplicates were created
    total_customers_after = db_session.query(Customer).count()
    assert total_customers_after == total_customers_before


def test_customer_login_auto_register_new_user(client: TestClient, db_session: Session):
    """POST /api/v1/auth/customer/login with unknown phone auto-registers a new Customer."""
    phone = "11966662222"
    assert db_session.query(Customer).filter_by(phone=phone).first() is None

    response = client.post(
        "/api/v1/auth/customer/login",
        json={
            "phone": phone,
            "name": "Novo Cliente VIP",
            "email": "novo@exemplo.com",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "customer"
    assert data["customer"]["name"] == "Novo Cliente VIP"
    assert data["customer"]["phone"] == phone
    assert data["customer"]["email"] == "novo@exemplo.com"

    # Verify persisted in database
    created = db_session.query(Customer).filter_by(phone=phone).first()
    assert created is not None
    assert created.id == data["customer"]["id"]
    assert created.name == "Novo Cliente VIP"


def test_customer_login_default_name_when_omitted(client: TestClient, db_session: Session):
    """POST /api/v1/auth/customer/login without name defaults name to 'Cliente'."""
    phone = "11955553333"
    response = client.post("/api/v1/auth/customer/login", json={"phone": phone})
    assert response.status_code == 200
    data = response.json()
    assert data["customer"]["name"] == "Cliente"


def test_customer_login_update_name_if_provided(client: TestClient, db_session: Session):
    """POST /api/v1/auth/customer/login updates name if existing customer has different name."""
    customer = Customer(name="Cliente Antigo", phone="11944440000")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    response = client.post(
        "/api/v1/auth/customer/login",
        json={"phone": "11944440000", "name": "Cliente Atualizado"},
    )
    assert response.status_code == 200
    assert response.json()["customer"]["name"] == "Cliente Atualizado"

    db_session.refresh(customer)
    assert customer.name == "Cliente Atualizado"


def test_customer_login_validation_error(client: TestClient):
    """POST /api/v1/auth/customer/login with invalid phone or email returns 422."""
    # Phone too short
    res_phone = client.post("/api/v1/auth/customer/login", json={"phone": "123"})
    assert res_phone.status_code == 422

    # Malformed email
    res_email = client.post(
        "/api/v1/auth/customer/login",
        json={"phone": "11988887777", "email": "not-an-email"},
    )
    assert res_email.status_code == 422


def test_customer_me_success(client: TestClient, db_session: Session):
    """GET /api/v1/auth/customer/me with valid token returns current customer profile."""
    customer = Customer(
        name="Gabriel Santos",
        phone="11933334444",
        email="gabriel@exemplo.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    # Login to obtain token
    login_res = client.post(
        "/api/v1/auth/customer/login",
        json={"phone": "11933334444"},
    )
    cust_token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/auth/customer/me",
        headers={"Authorization": f"Bearer {cust_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == customer.id
    assert data["name"] == "Gabriel Santos"
    assert data["phone"] == "11933334444"
    assert data["email"] == "gabriel@exemplo.com"


def test_customer_me_unauthorized_without_token(client: TestClient):
    """GET /api/v1/auth/customer/me without token returns 401 Unauthorized."""
    response = client.get("/api/v1/auth/customer/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Token de autenticação não fornecido"


def test_customer_me_forbidden_with_admin_token(client: TestClient, default_business_settings: BusinessSettings):
    """GET /api/v1/auth/customer/me with admin token returns 403 Forbidden."""
    login_res = client.post("/api/v1/auth/admin/login", json={"pin": "1234"})
    admin_token = login_res.json()["access_token"]

    response = client.get(
        "/api/v1/auth/customer/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Acesso restrito ao cliente"
