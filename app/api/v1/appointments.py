from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.appointment import (
    BookWithCreditRequest,
    AppointmentResponse,
)
from app.services.appointment_service import AppointmentService

router = APIRouter(tags=["appointments"])


@router.post(
    "/appointments/book-with-credit",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book appointment using package credit",
)
@router.post(
    "/api/v1/appointments/book-with-credit",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def book_with_credit(
    payload: BookWithCreditRequest,
    db: Session = Depends(get_db),
):
    """
    Executes appointment booking with credit deduction in an ACID transaction:
    validates package active status and balance, locks professional schedule,
    creates appointment, debits 1 credit, and registers in the audit ledger.
    """
    return AppointmentService.book_with_credit(
        db=db,
        customer_package_id=payload.customer_package_id,
        service_id=payload.service_id,
        professional_id=payload.professional_id,
        start_time=payload.start_time,
        idempotency_key=payload.idempotency_key,
    )
