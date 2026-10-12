import datetime
import pytest
import jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    DEFAULT_ADMIN_PIN,
    hash_pin,
    verify_pin,
    create_access_token,
    decode_access_token,
)
from app.models.business_settings import BusinessSettings


def test_config_jwt_settings():
    """Verify that JWT and authentication settings are configured."""
    assert hasattr(settings, "JWT_SECRET")
    assert settings.JWT_SECRET is not None
    assert settings.JWT_ALGORITHM == "HS256"
    assert settings.ADMIN_TOKEN_EXPIRE_HOURS == 12
    assert settings.CUSTOMER_TOKEN_EXPIRE_DAYS == 30


def test_hash_and_verify_pin_success():
    """Verify that hash_pin creates a verifiable hash for the correct PIN."""
    pin = "1234"
    hashed = hash_pin(pin)
    assert hashed != pin
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
    assert verify_pin(pin, hashed) is True


def test_hash_and_verify_pin_mismatch():
    """Verify that verify_pin returns False for mismatched or invalid PIN."""
    hashed = hash_pin("1234")
    assert verify_pin("9999", hashed) is False
    assert verify_pin("", hashed) is False
    assert verify_pin("1234", "invalid_hash_value") is False


def test_create_and_decode_valid_jwt():
    """Verify that create_access_token and decode_access_token round-trip claims correctly."""
    payload = {
        "sub": "1",
        "role": "admin",
    }
    token = create_access_token(payload)
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == "1"
    assert decoded["role"] == "admin"
    assert "exp" in decoded


def test_create_access_token_custom_expires_delta():
    """Verify token creation with a custom expiration delta."""
    payload = {
        "sub": "cust_42",
        "role": "customer",
    }
    delta = datetime.timedelta(days=settings.CUSTOMER_TOKEN_EXPIRE_DAYS)
    token = create_access_token(payload, expires_delta=delta)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "cust_42"
    assert decoded["role"] == "customer"


def test_decode_expired_jwt_raises_error():
    """Verify that an expired JWT token raises jwt.ExpiredSignatureError."""
    payload = {
        "sub": "admin",
        "role": "admin",
    }
    # Expire 1 hour in the past
    delta = datetime.timedelta(hours=-1)
    token = create_access_token(payload, expires_delta=delta)

    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)


def test_decode_invalid_jwt_raises_error():
    """Verify that tampered or invalid JWT raises InvalidTokenError or PyJWTError."""
    payload = {"sub": "admin", "role": "admin"}
    token = create_access_token(payload)
    tampered_token = token[:-5] + "XXXXX"

    with pytest.raises((jwt.InvalidTokenError, jwt.PyJWTError)):
        decode_access_token(tampered_token)

    with pytest.raises((jwt.InvalidTokenError, jwt.PyJWTError)):
        decode_access_token("completely.invalid.token")


def test_business_settings_default_pin_hash(db_session: Session):
    """Verify that BusinessSettings creates a default admin_pin_hash valid for '1234'."""
    # Instantiation without db session
    bs_instance = BusinessSettings(business_name="Barbearia Teste")
    assert bs_instance.admin_pin_hash is not None
    assert verify_pin("1234", bs_instance.admin_pin_hash) is True
    assert verify_pin(DEFAULT_ADMIN_PIN, bs_instance.admin_pin_hash) is True

    # Persisted in database
    db_session.add(bs_instance)
    db_session.commit()
    db_session.refresh(bs_instance)

    assert bs_instance.id is not None
    assert bs_instance.admin_pin_hash is not None
    assert verify_pin("1234", bs_instance.admin_pin_hash) is True
