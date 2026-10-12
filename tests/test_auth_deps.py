import datetime
import pytest
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token
from app.models.customer import Customer

# Modules under test
from app.schemas.auth import (
    AdminLoginRequest,
    AdminTokenResponse,
    ChangePinRequest,
    CustomerLoginRequest,
    CustomerTokenResponse,
)
from app.schemas.customer import CustomerResponse
from app.api.deps import (
    get_current_admin,
    get_current_customer,
    get_optional_customer,
    oauth2_scheme,
)


# ==============================================================================
# 1. Pydantic Schemas Validation Tests
# ==============================================================================

def test_admin_login_request_valid():
    req = AdminLoginRequest(pin="1234")
    assert req.pin == "1234"

    req8 = AdminLoginRequest(pin="12345678")
    assert req8.pin == "12345678"


def test_admin_login_request_invalid_length():
    with pytest.raises(ValidationError):
        AdminLoginRequest(pin="123")  # min_length is 4

    with pytest.raises(ValidationError):
        AdminLoginRequest(pin="123456789")  # max_length is 8


def test_admin_token_response_defaults():
    res = AdminTokenResponse(access_token="test-token", expires_in=86400)
    assert res.access_token == "test-token"
    assert res.token_type == "bearer"
    assert res.role == "admin"
    assert res.expires_in == 86400


def test_change_pin_request_valid():
    req = ChangePinRequest(old_pin="1234", new_pin="5678")
    assert req.old_pin == "1234"
    assert req.new_pin == "5678"


def test_change_pin_request_invalid():
    with pytest.raises(ValidationError):
        ChangePinRequest(old_pin="1234", new_pin="12")  # min 4

    with pytest.raises(ValidationError):
        ChangePinRequest(old_pin="1234", new_pin="123456789")  # max 8


def test_customer_login_request_valid():
    req = CustomerLoginRequest(phone="11999998888")
    assert req.phone == "11999998888"
    assert req.name is None
    assert req.email is None

    req_full = CustomerLoginRequest(
        phone="11999998888",
        name="João Barbeiro",
        email="joao@example.com",
    )
    assert req_full.name == "João Barbeiro"
    assert req_full.email == "joao@example.com"


def test_customer_login_request_invalid():
    with pytest.raises(ValidationError):
        CustomerLoginRequest(phone="123")  # min_length is 8

    with pytest.raises(ValidationError):
        CustomerLoginRequest(phone="11999998888", email="invalid-email")


def test_customer_response_schema(db_session: Session):
    now = datetime.datetime.now(datetime.timezone.utc)
    c_schema = CustomerResponse(
        id=1,
        name="Carlos",
        phone="11999998888",
        email="carlos@example.com",
        notes="Cliente VIP",
        created_at=now,
    )
    assert c_schema.id == 1
    assert c_schema.name == "Carlos"

    # From ORM model
    customer = Customer(
        name="Ana Paula",
        phone="11977776666",
        email="ana@example.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    c_from_orm = CustomerResponse.model_validate(customer)
    assert c_from_orm.id == customer.id
    assert c_from_orm.name == "Ana Paula"
    assert c_from_orm.phone == "11977776666"


def test_customer_token_response(db_session: Session):
    customer = Customer(name="Marcos", phone="11911112222")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    res = CustomerTokenResponse(
        access_token="cust-token",
        customer=CustomerResponse.model_validate(customer),
    )
    assert res.access_token == "cust-token"
    assert res.token_type == "bearer"
    assert res.role == "customer"
    assert res.customer.id == customer.id


# ==============================================================================
# 2. Dependency Unit Function Tests
# ==============================================================================

def test_get_current_admin_unit():
    # Valid admin
    token = create_access_token({"sub": "admin", "role": "admin"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    payload = get_current_admin(credentials=creds)
    assert payload["sub"] == "admin"
    assert payload["role"] == "admin"

    # Missing credentials
    with pytest.raises(HTTPException) as exc_info:
        get_current_admin(credentials=None)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Token de autenticação não fornecido"

    # Role mismatch (customer token)
    cust_token = create_access_token({"sub": "1", "role": "customer"})
    creds_cust = HTTPAuthorizationCredentials(scheme="Bearer", credentials=cust_token)
    with pytest.raises(HTTPException) as exc_info:
        get_current_admin(credentials=creds_cust)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Acesso restrito ao administrador"

    # Invalid token
    creds_bad = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad.jwt.token")
    with pytest.raises(HTTPException) as exc_info:
        get_current_admin(credentials=creds_bad)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Token inválido ou expirado"


def test_get_current_customer_unit(db_session: Session):
    customer = Customer(name="Lucas", phone="11955554444")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    # Valid customer
    token = create_access_token({"sub": str(customer.id), "role": "customer"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    cust = get_current_customer(credentials=creds, db=db_session)
    assert cust.id == customer.id
    assert cust.name == "Lucas"

    # Missing credentials
    with pytest.raises(HTTPException) as exc_info:
        get_current_customer(credentials=None, db=db_session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Token de autenticação não fornecido"

    # Role mismatch (admin token)
    admin_token = create_access_token({"sub": "admin", "role": "admin"})
    creds_admin = HTTPAuthorizationCredentials(scheme="Bearer", credentials=admin_token)
    with pytest.raises(HTTPException) as exc_info:
        get_current_customer(credentials=creds_admin, db=db_session)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "Acesso restrito ao cliente"

    # Customer not found
    nonexistent_token = create_access_token({"sub": "99999", "role": "customer"})
    creds_nonexistent = HTTPAuthorizationCredentials(scheme="Bearer", credentials=nonexistent_token)
    with pytest.raises(HTTPException) as exc_info:
        get_current_customer(credentials=creds_nonexistent, db=db_session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Cliente não encontrado"

    # Invalid token
    creds_bad = HTTPAuthorizationCredentials(scheme="Bearer", credentials="bad.token")
    with pytest.raises(HTTPException) as exc_info:
        get_current_customer(credentials=creds_bad, db=db_session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Token inválido ou expirado"


def test_get_optional_customer_unit(db_session: Session):
    customer = Customer(name="Pedro", phone="11933332222")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    # Valid customer token
    token = create_access_token({"sub": str(customer.id), "role": "customer"})
    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    opt = get_optional_customer(credentials=creds, db=db_session)
    assert opt is not None
    assert opt.id == customer.id

    # None credentials
    assert get_optional_customer(credentials=None, db=db_session) is None

    # Admin token (role is not customer)
    admin_token = create_access_token({"sub": "admin", "role": "admin"})
    creds_admin = HTTPAuthorizationCredentials(scheme="Bearer", credentials=admin_token)
    assert get_optional_customer(credentials=creds_admin, db=db_session) is None

    # Invalid token
    creds_bad = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage.token")
    assert get_optional_customer(credentials=creds_bad, db=db_session) is None

    # Nonexistent customer
    token_missing = create_access_token({"sub": "88888", "role": "customer"})
    creds_missing = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token_missing)
    assert get_optional_customer(credentials=creds_missing, db=db_session) is None


# ==============================================================================
# 3. FastAPI Route Integration Tests with TestClient
# ==============================================================================

@pytest.fixture
def auth_test_app(db_session: Session):
    app = FastAPI()

    @app.get("/admin/secure")
    def admin_route(admin: dict = Depends(get_current_admin)):
        return {"message": "hello admin", "user": admin.get("sub")}

    @app.get("/customer/secure")
    def customer_route(customer: Customer = Depends(get_current_customer)):
        return {"message": "hello customer", "customer_id": customer.id, "name": customer.name}

    @app.get("/public/optional")
    def optional_route(customer: Customer | None = Depends(get_optional_customer)):
        if customer:
            return {"authenticated": True, "customer_id": customer.id}
        return {"authenticated": False, "customer_id": None}

    app.dependency_overrides[get_db] = lambda: db_session
    return app


def test_api_admin_route_success(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    token = create_access_token({"sub": "admin", "role": "admin"})

    res = client.get("/admin/secure", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json() == {"message": "hello admin", "user": "admin"}


def test_api_admin_route_missing_token(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    res = client.get("/admin/secure")
    assert res.status_code == 401
    assert res.json()["detail"] == "Token de autenticação não fornecido"


def test_api_admin_route_role_mismatch(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    cust_token = create_access_token({"sub": "1", "role": "customer"})
    res = client.get("/admin/secure", headers={"Authorization": f"Bearer {cust_token}"})
    assert res.status_code == 403
    assert res.json()["detail"] == "Acesso restrito ao administrador"


def test_api_admin_route_invalid_token(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    res = client.get("/admin/secure", headers={"Authorization": "Bearer invalid.token"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Token inválido ou expirado"


def test_api_customer_route_success(auth_test_app: FastAPI, db_session: Session):
    customer = Customer(name="Roberto", phone="11922223333")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    client = TestClient(auth_test_app)
    token = create_access_token({"sub": str(customer.id), "role": "customer"})

    res = client.get("/customer/secure", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["customer_id"] == customer.id
    assert res.json()["name"] == "Roberto"


def test_api_customer_route_missing_token(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    res = client.get("/customer/secure")
    assert res.status_code == 401
    assert res.json()["detail"] == "Token de autenticação não fornecido"


def test_api_customer_route_role_mismatch(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    admin_token = create_access_token({"sub": "admin", "role": "admin"})
    res = client.get("/customer/secure", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 403
    assert res.json()["detail"] == "Acesso restrito ao cliente"


def test_api_customer_route_nonexistent_customer(auth_test_app: FastAPI):
    client = TestClient(auth_test_app)
    token = create_access_token({"sub": "99999", "role": "customer"})
    res = client.get("/customer/secure", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Cliente não encontrado"


def test_api_optional_route_with_and_without_token(auth_test_app: FastAPI, db_session: Session):
    customer = Customer(name="Amanda", phone="11944445555")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    client = TestClient(auth_test_app)

    # 1. No token -> authenticated = False
    res_none = client.get("/public/optional")
    assert res_none.status_code == 200
    assert res_none.json() == {"authenticated": False, "customer_id": None}

    # 2. Valid token -> authenticated = True
    token = create_access_token({"sub": str(customer.id), "role": "customer"})
    res_valid = client.get("/public/optional", headers={"Authorization": f"Bearer {token}"})
    assert res_valid.status_code == 200
    assert res_valid.json() == {"authenticated": True, "customer_id": customer.id}

    # 3. Invalid token -> authenticated = False (gracefully ignored)
    res_bad = client.get("/public/optional", headers={"Authorization": "Bearer bad.token"})
    assert res_bad.status_code == 200
    assert res_bad.json() == {"authenticated": False, "customer_id": None}
