import datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.customer import Customer
from app.models.package import (
    Package,
    CustomerPackage,
    CustomerPackageBalance,
    PackageStatus,
)
from app.models.ledger import CreditLedgerTransaction, LedgerTransactionType


class CustomerNotFoundError(HTTPException):
    def __init__(self, detail: str = "Customer not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class PackageNotFoundError(HTTPException):
    def __init__(self, detail: str = "Package not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class PackageInactiveError(HTTPException):
    def __init__(self, detail: str = "Package is inactive"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class PackageService:
    @staticmethod
    def purchase_package(
        db: Session,
        customer_id: int,
        package_id: int,
        idempotency_key: Optional[str] = None,
    ) -> CustomerPackage:
        """
        Executes package purchase in an ACID transaction:
        1. Checks idempotency: if idempotency_key is provided and exists, returns existing CustomerPackage.
        2. Validates customer and package exist and package is active.
        3. Calculates expires_at = now + validity_days.
        4. Creates CustomerPackage with status ACTIVE.
        5. For each package item, creates CustomerPackageBalance and CreditLedgerTransaction (PURCHASE).
        """
        # 1. Idempotency check
        if idempotency_key:
            existing_tx = db.scalar(
                select(CreditLedgerTransaction).where(
                    CreditLedgerTransaction.idempotency_key == idempotency_key
                )
            )
            if existing_tx is not None:
                existing_cp = db.scalar(
                    select(CustomerPackage)
                    .options(selectinload(CustomerPackage.balances))
                    .where(CustomerPackage.id == existing_tx.customer_package_id)
                )
                if existing_cp is not None:
                    return existing_cp

        # 2. Customer validation
        customer = db.get(Customer, customer_id)
        if customer is None:
            raise CustomerNotFoundError(f"Customer with id {customer_id} not found")

        # 3. Package validation
        package = db.scalar(
            select(Package)
            .options(selectinload(Package.items))
            .where(Package.id == package_id)
        )
        if package is None:
            raise PackageNotFoundError(f"Package with id {package_id} not found")

        if not package.is_active:
            raise PackageInactiveError(f"Package '{package.name}' is inactive")

        # Start transaction block
        try:
            now = datetime.datetime.now()
            expires_at = now + datetime.timedelta(days=package.validity_days)

            # 4. Create CustomerPackage
            customer_package = CustomerPackage(
                customer_id=customer.id,
                package_id=package.id,
                status=PackageStatus.ACTIVE,
                purchased_at=now,
                expires_at=expires_at,
            )
            db.add(customer_package)
            db.flush()

            # 5. Create balances and ledger transactions
            for idx, item in enumerate(package.items):
                balance = CustomerPackageBalance(
                    customer_package_id=customer_package.id,
                    service_id=item.service_id,
                    total_quantity=item.quantity,
                    remaining_quantity=item.quantity,
                )
                db.add(balance)

                # Assign idempotency key for transactions
                tx_idempotency_key = None
                if idempotency_key:
                    if idx == 0:
                        tx_idempotency_key = idempotency_key
                    else:
                        tx_idempotency_key = f"{idempotency_key}__item_{item.service_id}_{idx}"

                ledger_tx = CreditLedgerTransaction(
                    customer_package_id=customer_package.id,
                    service_id=item.service_id,
                    appointment_id=None,
                    type=LedgerTransactionType.PURCHASE,
                    amount=item.quantity,
                    balance_after=item.quantity,
                    idempotency_key=tx_idempotency_key,
                    notes=f"Purchase of package {package.name}",
                )
                db.add(ledger_tx)

            db.commit()
            db.refresh(customer_package)
            # Ensure balances are eager loaded
            _ = customer_package.balances
            return customer_package
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_customer_packages(
        db: Session,
        customer_id: int,
    ) -> List[CustomerPackage]:
        """
        Retrieves all packages for a customer with lazy expiration check:
        if now > expires_at and status is ACTIVE, updates status to EXPIRED.
        """
        customer = db.get(Customer, customer_id)
        if customer is None:
            raise CustomerNotFoundError(f"Customer with id {customer_id} not found")

        stmt = (
            select(CustomerPackage)
            .options(selectinload(CustomerPackage.balances))
            .where(CustomerPackage.customer_id == customer_id)
            .order_by(CustomerPackage.purchased_at.desc())
        )
        packages = list(db.scalars(stmt).all())

        now = datetime.datetime.now()
        has_updates = False
        for cp in packages:
            current_now = (
                datetime.datetime.now(datetime.timezone.utc)
                if (cp.expires_at and cp.expires_at.tzinfo is not None)
                else now
            )
            if cp.status == PackageStatus.ACTIVE and cp.expires_at < current_now:
                cp.status = PackageStatus.EXPIRED
                has_updates = True

        if has_updates:
            db.commit()

        return packages
