from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.package import (
    PackagePurchaseRequest,
    CustomerPackageResponse,
)
from app.services.package_service import PackageService

router = APIRouter(tags=["packages"])


@router.post(
    "/packages/purchase",
    response_model=CustomerPackageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Purchase a promotional package",
)
@router.post(
    "/api/v1/packages/purchase",
    response_model=CustomerPackageResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def purchase_package(
    payload: PackagePurchaseRequest,
    db: Session = Depends(get_db),
):
    """
    Executes package purchase: creates customer package, sets initial balances,
    and records PURCHASE credit ledger transactions.
    """
    return PackageService.purchase_package(
        db=db,
        customer_id=payload.customer_id,
        package_id=payload.package_id,
        idempotency_key=payload.idempotency_key,
    )


@router.get(
    "/customers/{customer_id}/packages",
    response_model=List[CustomerPackageResponse],
    status_code=status.HTTP_200_OK,
    summary="Get customer packages with balance and lazy expiration",
)
@router.get(
    "/api/v1/customers/{customer_id}/packages",
    response_model=List[CustomerPackageResponse],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_customer_packages(
    customer_id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieves all purchased packages for a customer with balances and lazy expiration check.
    """
    return PackageService.get_customer_packages(
        db=db,
        customer_id=customer_id,
    )
