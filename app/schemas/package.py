from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.package import PackageStatus


class PackagePurchaseRequest(BaseModel):
    customer_id: int
    package_id: int
    idempotency_key: Optional[str] = None


class CustomerPackageBalanceResponse(BaseModel):
    id: int
    customer_package_id: int
    service_id: int
    total_quantity: int
    remaining_quantity: int

    model_config = ConfigDict(from_attributes=True)


class CustomerPackageResponse(BaseModel):
    id: int
    customer_id: int
    package_id: int
    status: PackageStatus
    purchased_at: datetime
    expires_at: datetime
    balances: List[CustomerPackageBalanceResponse] = []

    model_config = ConfigDict(from_attributes=True)


class PackageItemResponse(BaseModel):
    id: int
    service_id: int
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class PackageResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: Decimal
    validity_days: int
    is_active: bool
    items: List[PackageItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
