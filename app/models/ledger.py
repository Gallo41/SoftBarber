import datetime
import enum
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    BigInteger,
    Enum,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    DateTime,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.package import CustomerPackage
    from app.models.service import Service
    from app.models.appointment import Appointment


class LedgerTransactionType(str, enum.Enum):
    PURCHASE = "PURCHASE"
    DEBIT_BOOKING = "DEBIT_BOOKING"
    REFUND_CANCELLATION = "REFUND_CANCELLATION"
    EXPIRATION = "EXPIRATION"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"


class CreditLedgerTransaction(Base):
    __tablename__ = "credit_ledger_transactions"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    customer_package_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("customer_packages.id"),
        nullable=False,
    )
    service_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("services.id"),
        nullable=False,
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("appointments.id"),
        nullable=True,
    )
    type: Mapped[LedgerTransactionType] = mapped_column(
        Enum(LedgerTransactionType),
        nullable=False,
    )
    amount: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    balance_after: Mapped[int] = mapped_column(
        SmallInteger,
        nullable=False,
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    customer_package: Mapped["CustomerPackage"] = relationship(
        "CustomerPackage",
        back_populates="transactions",
    )
    service: Mapped["Service"] = relationship(
        "Service",
    )
    appointment: Mapped[Optional["Appointment"]] = relationship(
        "Appointment",
        back_populates="transactions",
    )
