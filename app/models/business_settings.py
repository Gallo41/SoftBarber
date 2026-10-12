import datetime
from sqlalchemy import BigInteger, Integer, SmallInteger, String, Time, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.security import hash_pin, DEFAULT_ADMIN_PIN


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    business_name: Mapped[str] = mapped_column(String(150), nullable=False)
    admin_pin_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default=lambda: hash_pin(DEFAULT_ADMIN_PIN),
    )
    cancellation_window_hours: Mapped[int] = mapped_column(
        Integer,
        default=2,
        server_default="2",
        nullable=False,
    )
    default_slot_interval_minutes: Mapped[int] = mapped_column(
        SmallInteger,
        default=30,
        server_default="30",
        nullable=False,
    )
    open_time: Mapped[datetime.time] = mapped_column(
        Time,
        default=datetime.time(8, 0, 0),
        server_default="08:00:00",
        nullable=False,
    )
    close_time: Mapped[datetime.time] = mapped_column(
        Time,
        default=datetime.time(20, 0, 0),
        server_default="20:00:00",
        nullable=False,
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __init__(self, **kwargs):
        if "admin_pin_hash" not in kwargs:
            kwargs["admin_pin_hash"] = hash_pin(DEFAULT_ADMIN_PIN)
        super().__init__(**kwargs)
