import datetime
import enum
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    BigInteger,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    DateTime,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.professional import Professional
    from app.models.service import Service
    from app.models.ledger import CreditLedgerTransaction


class AppointmentStatus(str, enum.Enum):
    BOOKED = "BOOKED"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class PaymentType(str, enum.Enum):
    PACKAGE_CREDIT = "PACKAGE_CREDIT"
    AVULSO_LOCAL = "AVULSO_LOCAL"
    AVULSO_ONLINE = "AVULSO_ONLINE"


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        Index("idx_prof_window", "professional_id", "start_time", "end_time", "status"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    professional_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("professionals.id"),
        nullable=False,
    )
    customer_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("customers.id"),
        nullable=False,
    )
    service_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("services.id"),
        nullable=False,
    )
    start_time: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        nullable=False,
    )
    end_time: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        nullable=False,
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus),
        default=AppointmentStatus.BOOKED,
        server_default=AppointmentStatus.BOOKED.value,
        nullable=False,
    )
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType),
        nullable=False,
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    cancelled_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    professional: Mapped["Professional"] = relationship(
        "Professional",
        back_populates="appointments",
    )
    customer: Mapped["Customer"] = relationship(
        "Customer",
        back_populates="appointments",
    )
    service: Mapped["Service"] = relationship(
        "Service",
        back_populates="appointments",
    )
    transactions: Mapped[List["CreditLedgerTransaction"]] = relationship(
        "CreditLedgerTransaction",
        back_populates="appointment",
    )
