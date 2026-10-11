import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.appointment import AppointmentStatus, PaymentType


class BookWithCreditRequest(BaseModel):
    customer_package_id: int
    service_id: int
    professional_id: int
    start_time: datetime.datetime
    idempotency_key: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    professional_id: int
    customer_id: int
    service_id: int
    start_time: datetime.datetime
    end_time: datetime.datetime
    status: AppointmentStatus
    payment_type: PaymentType
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
