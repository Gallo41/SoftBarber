import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, SmallInteger, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.service import Service
    from app.models.appointment import Appointment


class Professional(Base):
    __tablename__ = "professionals"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
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
    services: Mapped[List["ProfessionalService"]] = relationship(
        "ProfessionalService",
        back_populates="professional",
        cascade="all, delete-orphan",
    )
    appointments: Mapped[List["Appointment"]] = relationship(
        "Appointment",
        back_populates="professional",
    )


class ProfessionalService(Base):
    __tablename__ = "professional_services"

    professional_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("professionals.id", ondelete="CASCADE"),
        primary_key=True,
    )
    service_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("services.id", ondelete="CASCADE"),
        primary_key=True,
    )
    custom_duration_minutes: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)

    # Relationships
    professional: Mapped["Professional"] = relationship(
        "Professional",
        back_populates="services",
    )
    service: Mapped["Service"] = relationship(
        "Service",
        back_populates="professionals",
    )
