import datetime
from typing import List, Optional, Union
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.professional import Professional, ProfessionalService
from app.models.service import Service
from app.models.settings import BusinessSettings
from app.models.appointment import Appointment, AppointmentStatus
from app.schemas.schedule import AvailableSlot, AvailableSlotsResponse


class ProfessionalNotFoundError(HTTPException):
    def __init__(self, detail: str = "Professional not found or inactive"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ServiceNotFoundError(HTTPException):
    def __init__(self, detail: str = "Service not found or inactive"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ScheduleService:
    @staticmethod
    def get_available_slots(
        db: Session,
        professional_id: int,
        service_id: int,
        target_date: Union[datetime.date, datetime.datetime, str],
        now: Optional[datetime.datetime] = None,
    ) -> AvailableSlotsResponse:
        """
        Calculates available booking slots for a given professional and service on target_date.
        - Validates professional and service exist and are active.
        - Determines service duration (checks custom_duration_minutes, fallbacks to service.duration_minutes).
        - Retrieves operating hours and interval from BusinessSettings (fallback: 08:00 - 20:00, 30 min).
        - Queries existing non-cancelled appointments for conflict checking.
        - If target_date is today or earlier, excludes slots where slot_start <= now.
        - Returns AvailableSlotsResponse with candidate slots strictly within [open_time, close_time].
        """
        # 1. Normalize target_date
        if isinstance(target_date, str):
            target_date = datetime.date.fromisoformat(target_date)
        elif isinstance(target_date, datetime.datetime):
            target_date = target_date.date()

        # 2. Validate professional exists and is active
        professional = db.get(Professional, professional_id)
        if professional is None or not professional.is_active:
            raise ProfessionalNotFoundError(f"Professional {professional_id} not found or inactive")

        # 3. Validate service exists and is active
        service = db.get(Service, service_id)
        if service is None or not service.is_active:
            raise ServiceNotFoundError(f"Service {service_id} not found or inactive")

        # 4. Determine duration (custom professional duration first, then default service duration)
        duration_minutes = service.duration_minutes
        prof_service = db.scalar(
            select(ProfessionalService).where(
                ProfessionalService.professional_id == professional_id,
                ProfessionalService.service_id == service_id,
            )
        )
        if prof_service and prof_service.custom_duration_minutes is not None:
            duration_minutes = prof_service.custom_duration_minutes

        # 5. Retrieve operating hours and slot interval from BusinessSettings
        settings = db.scalar(select(BusinessSettings))
        open_time = settings.open_time if (settings and settings.open_time) else datetime.time(8, 0, 0)
        close_time = settings.close_time if (settings and settings.close_time) else datetime.time(20, 0, 0)
        slot_interval_minutes = (
            settings.default_slot_interval_minutes
            if (settings and settings.default_slot_interval_minutes)
            else 30
        )

        if isinstance(open_time, str):
            open_time = datetime.time.fromisoformat(open_time)
        if isinstance(close_time, str):
            close_time = datetime.time.fromisoformat(close_time)

        # 6. Query existing appointments on target_date for the professional
        day_start = datetime.datetime.combine(target_date, datetime.time.min)
        day_end = datetime.datetime.combine(target_date, datetime.time.max)

        existing_appointments = db.scalars(
            select(Appointment).where(
                Appointment.professional_id == professional_id,
                Appointment.status.notin_([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]),
                Appointment.start_time < day_end,
                Appointment.end_time > day_start,
            )
        ).all()

        # 7. Slot generation
        current_now = now or datetime.datetime.now()
        if current_now.tzinfo is not None:
            current_now = current_now.replace(tzinfo=None)

        current_start = datetime.datetime.combine(target_date, open_time)
        day_close = datetime.datetime.combine(target_date, close_time)
        step = datetime.timedelta(minutes=slot_interval_minutes)
        duration = datetime.timedelta(minutes=duration_minutes)

        slots: List[AvailableSlot] = []

        while current_start + duration <= day_close:
            slot_start = current_start
            slot_end = current_start + duration

            # Exclude slots in the past for today or earlier dates
            if target_date <= current_now.date() and slot_start <= current_now:
                current_start += step
                continue

            # Overlap check: slot_start < appt.end_time and slot_end > appt.start_time
            has_conflict = False
            for appt in existing_appointments:
                appt_start = appt.start_time.replace(tzinfo=None) if appt.start_time.tzinfo else appt.start_time
                appt_end = appt.end_time.replace(tzinfo=None) if appt.end_time.tzinfo else appt.end_time
                if slot_start < appt_end and slot_end > appt_start:
                    has_conflict = True
                    break

            if not has_conflict:
                slots.append(AvailableSlot(start_time=slot_start, end_time=slot_end))

            current_start += step

        return AvailableSlotsResponse(
            professional_id=professional_id,
            service_id=service_id,
            date=target_date,
            duration_minutes=duration_minutes,
            slots=slots,
        )
