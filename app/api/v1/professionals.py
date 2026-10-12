import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.schedule import AvailableSlotsResponse
from app.services.schedule_service import ScheduleService

router = APIRouter(tags=["professionals"])


@router.get(
    "/professionals/{professional_id}/available-slots",
    response_model=AvailableSlotsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get available appointment slots for a professional and service",
)
@router.get(
    "/api/v1/professionals/{professional_id}/available-slots",
    response_model=AvailableSlotsResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def get_available_slots(
    professional_id: int,
    service_id: int = Query(..., description="ID of the service to be performed"),
    date: Optional[datetime.date] = Query(None, description="Target date (YYYY-MM-DD)"),
    target_date: Optional[datetime.date] = Query(None, description="Alternative target date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> AvailableSlotsResponse:
    """
    Calculates and returns available booking slots for a professional on a given date,
    factoring in business operating hours, service duration (or custom professional duration),
    and existing non-cancelled appointments.
    """
    query_date = date or target_date
    if query_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query parameter 'date' is required",
        )

    return ScheduleService.get_available_slots(
        db=db,
        professional_id=professional_id,
        service_id=service_id,
        target_date=query_date,
    )
