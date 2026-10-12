import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings as app_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    hash_pin,
    verify_pin,
    DEFAULT_ADMIN_PIN,
)
from app.api.deps import get_current_admin, get_current_customer
from app.models.business_settings import BusinessSettings
from app.models.customer import Customer
from app.schemas.auth import (
    AdminLoginRequest,
    AdminTokenResponse,
    ChangePinRequest,
    CustomerLoginRequest,
    CustomerTokenResponse,
)
from app.schemas.customer import CustomerResponse

router = APIRouter(tags=["auth"])


def _get_or_create_business_settings(db: Session) -> BusinessSettings:
    """Retrieve existing BusinessSettings or create initial record with default PIN."""
    settings = db.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(
            business_name=app_settings.BUSINESS_NAME,
            admin_pin_hash=hash_pin(DEFAULT_ADMIN_PIN),
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


# ==============================================================================
# Admin Authentication Endpoints
# ==============================================================================

@router.post(
    "/auth/admin/login",
    response_model=AdminTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Admin PIN Login",
)
@router.post(
    "/admin/login",
    response_model=AdminTokenResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def admin_login(
    payload: AdminLoginRequest,
    db: Session = Depends(get_db),
) -> AdminTokenResponse:
    """
    Authenticate shop administrator via numeric PIN.
    Returns short/medium-lived JWT access token with role 'admin'.
    """
    settings = _get_or_create_business_settings(db)

    if not verify_pin(payload.pin, settings.admin_pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PIN de acesso incorreto",
        )

    expires_delta = datetime.timedelta(hours=app_settings.ADMIN_TOKEN_EXPIRE_HOURS)
    token = create_access_token(
        data={"sub": "admin", "role": "admin"},
        expires_delta=expires_delta,
    )

    return AdminTokenResponse(
        access_token=token,
        token_type="bearer",
        role="admin",
        expires_in=app_settings.ADMIN_TOKEN_EXPIRE_HOURS * 3600,
    )


@router.post(
    "/auth/admin/change-pin",
    status_code=status.HTTP_200_OK,
    summary="Change Admin PIN",
)
@router.post(
    "/admin/change-pin",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def change_admin_pin(
    payload: ChangePinRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Update administrator numeric PIN.
    Requires active admin JWT and validation of existing old_pin.
    """
    settings = _get_or_create_business_settings(db)

    if not verify_pin(payload.old_pin, settings.admin_pin_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN atual incorreto",
        )

    settings.admin_pin_hash = hash_pin(payload.new_pin)
    db.commit()

    return {"message": "PIN administrativo alterado com sucesso"}


# ==============================================================================
# Customer Authentication Endpoints
# ==============================================================================

@router.post(
    "/auth/customer/login",
    response_model=CustomerTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Customer Phone Login and Onboarding",
)
@router.post(
    "/customer/login",
    response_model=CustomerTokenResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def customer_login(
    payload: CustomerLoginRequest,
    db: Session = Depends(get_db),
) -> CustomerTokenResponse:
    """
    Frictionless customer login via Phone/WhatsApp:
    - If customer exists, returns customer profile and long-lived JWT token.
    - If new phone, automatically registers customer and returns JWT token.
    """
    phone_clean = payload.phone.strip()

    customer = db.query(Customer).filter_by(phone=phone_clean).first()
    if not customer:
        digits = "".join(ch for ch in phone_clean if ch.isdigit())
        if digits:
            for c in db.query(Customer).all():
                if "".join(ch for ch in (c.phone or "") if ch.isdigit()) == digits:
                    customer = c
                    break

    if customer:
        if payload.name and payload.name.strip() and customer.name != payload.name.strip():
            customer.name = payload.name.strip()
        if payload.email and not customer.email:
            customer.email = payload.email
        db.commit()
        db.refresh(customer)
    else:
        name = payload.name.strip() if (payload.name and payload.name.strip()) else "Cliente"
        customer = Customer(
            name=name,
            phone=phone_clean,
            email=payload.email,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    expires_delta = datetime.timedelta(days=app_settings.CUSTOMER_TOKEN_EXPIRE_DAYS)
    token = create_access_token(
        data={
            "sub": str(customer.id),
            "role": "customer",
            "phone": customer.phone,
            "name": customer.name,
        },
        expires_delta=expires_delta,
    )

    return CustomerTokenResponse(
        access_token=token,
        token_type="bearer",
        role="customer",
        customer=CustomerResponse.model_validate(customer),
    )


@router.get(
    "/auth/customer/me",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current Customer Profile",
)
@router.get(
    "/customer/me",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_me(
    current_customer: Customer = Depends(get_current_customer),
) -> CustomerResponse:
    """
    Retrieve current authenticated customer profile and details.
    """
    return CustomerResponse.model_validate(current_customer)
