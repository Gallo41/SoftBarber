from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.schemas.customer import CustomerResponse


class AdminLoginRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=8, description="PIN numérico do estabelecimento")


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "admin"
    expires_in: int


class ChangePinRequest(BaseModel):
    old_pin: str
    new_pin: str = Field(..., min_length=4, max_length=8, description="Novo PIN numérico de 4 a 8 dígitos")


class CustomerLoginRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20, description="Telefone com DDD")
    name: Optional[str] = Field(None, max_length=150, description="Nome do cliente")
    email: Optional[EmailStr] = None


class CustomerTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "customer"
    customer: CustomerResponse
