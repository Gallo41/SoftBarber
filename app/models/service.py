import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import BigInteger, Boolean, Integer, Numeric, SmallInteger, String, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.professional import ProfessionalService
    from app.models.package import PackageItem
    from app.models.appointment import Appointment


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
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
    professionals: Mapped[List["ProfessionalService"]] = relationship(
        "ProfessionalService",
        back_populates="service",
        cascade="all, delete-orphan",
    )
    package_items: Mapped[List["PackageItem"]] = relationship(
        "PackageItem",
        back_populates="service",
    )
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment",
        back_populates="service",
    )
