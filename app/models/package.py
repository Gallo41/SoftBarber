import datetime
from decimal import Decimal
import enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    DateTime,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.service import Service
    from app.models.ledger import CreditLedgerTransaction


class PackageStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    EXHAUSTED = "EXHAUSTED"
    CANCELLED = "CANCELLED"


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    validity_days: Mapped[int] = mapped_column(
        Integer,
        default=90,
        server_default="90",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="1",
        nullable=False,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    items: Mapped[List["PackageItem"]] = relationship(
        "PackageItem",
        back_populates="package",
        cascade="all, delete-orphan",
    )
    customer_packages: Mapped[List["CustomerPackage"]] = relationship(
        "CustomerPackage",
        back_populates="package",
    )


class PackageItem(Base):
    __tablename__ = "package_items"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    package_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("services.id"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # Relationships
    package: Mapped["Package"] = relationship(
        "Package",
        back_populates="items",
    )
    service: Mapped["Service"] = relationship(
        "Service",
        back_populates="package_items",
    )


class CustomerPackage(Base):
    __tablename__ = "customer_packages"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    customer_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("customers.id"),
        nullable=False,
    )
    package_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("packages.id"),
        nullable=False,
    )
    status: Mapped[PackageStatus] = mapped_column(
        Enum(PackageStatus),
        default=PackageStatus.ACTIVE,
        server_default=PackageStatus.ACTIVE.value,
        nullable=False,
    )
    purchased_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    # Relationships
    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="customer_packages",
    )
    package: Mapped["Package"] = relationship(
        "Package",
        back_populates="customer_packages",
    )
    balances: Mapped[List["CustomerPackageBalance"]] = relationship(
        "CustomerPackageBalance",
        back_populates="customer_package",
        cascade="all, delete-orphan",
    )
    transactions: Mapped[List["CreditLedgerTransaction"]] = relationship(
        "CreditLedgerTransaction",
        back_populates="customer_package",
    )


class CustomerPackageBalance(Base):
    __tablename__ = "customer_package_balances"
    __table_args__ = (
        CheckConstraint("remaining_quantity >= 0", name="chk_remaining_positive"),
        UniqueConstraint("customer_package_id", "service_id", name="uq_pkg_service"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    customer_package_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("customer_packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    service_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("services.id"),
        nullable=False,
    )
    total_quantity: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    remaining_quantity: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # Relationships
    customer_package: Mapped["CustomerPackage"] = relationship(
        "CustomerPackage",
        back_populates="balances",
    )
    service: Mapped["Service"] = relationship(
        "Service",
    )
