import datetime
from decimal import Decimal
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Customer,
    Professional,
    Service,
    ProfessionalService,
    Appointment,
    AppointmentStatus,
    PaymentType,
    BusinessSettings,
)
from app.core.database import get_db

from app.schemas.schedule import (
    AvailableSlot,
    AvailableSlotsResponse,
)
from app.services.schedule_service import (
    ScheduleService,
    ProfessionalNotFoundError,
    ServiceNotFoundError,
)
from app.api.v1.professionals import router as professionals_router


@pytest.fixture
def sample_customer(db_session: Session) -> Customer:
    customer = Customer(
        name="Carlos Eduardo",
        phone="11988887777",
        email="carlos@example.com",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def sample_service(db_session: Session) -> Service:
    service = Service(
        name="Corte Masculino",
        duration_minutes=30,
        price=Decimal("45.00"),
        is_active=True,
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)
    return service


@pytest.fixture
def sample_professional(db_session: Session, sample_service: Service) -> Professional:
    prof = Professional(
        name="Barbeiro João",
        phone="11955554444",
        is_active=True,
    )
    db_session.add(prof)
    db_session.commit()
    db_session.refresh(prof)

    prof_service = ProfessionalService(
        professional_id=prof.id,
        service_id=sample_service.id,
        custom_duration_minutes=None,
    )
    db_session.add(prof_service)
    db_session.commit()
    return prof


@pytest.fixture
def test_client(db_session: Session) -> TestClient:
    app = FastAPI()
    app.include_router(professionals_router, prefix="/api/v1")

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


def test_get_available_slots_full_day_no_appointments(
    db_session: Session,
    sample_professional: Professional,
    sample_service: Service,
):
    """Full day of available slots when professional has no appointments (08:00-20:00, 30 min -> 24 slots)."""
    target_date = datetime.date.today() + datetime.timedelta(days=2)

    result = ScheduleService.get_available_slots(
        db=db_session,
        professional_id=sample_professional.id,
        service_id=sample_service.id,
        target_date=target_date,
    )

    assert isinstance(result, AvailableSlotsResponse)
    assert result.professional_id == sample_professional.id
    assert result.service_id == sample_service.id
    assert result.date == target_date
    assert result.duration_minutes == 30
    assert len(result.slots) == 24

    # First slot at 08:00
    assert result.slots[0].start_time == datetime.datetime.combine(target_date, datetime.time(8, 0))
    assert result.slots[0].end_time == datetime.datetime.combine(target_date, datetime.time(8, 30))

    # Last slot at 19:30 - 20:00
    assert result.slots[-1].start_time == datetime.datetime.combine(target_date, datetime.time(19, 30))
    assert result.slots[-1].end_time == datetime.datetime.combine(target_date, datetime.time(20, 0))


def test_get_available_slots_custom_business_settings(
    db_session: Session,
    sample_professional: Professional,
    sample_service: Service,
):
    """BusinessSettings with custom open_time, close_time, and interval."""
    settings = BusinessSettings(
        business_name="Barbearia Prime",
        open_time=datetime.time(9, 0),
        close_time=datetime.time(17, 0),
        default_slot_interval_minutes=60,
    )
    db_session.add(settings)
    db_session.commit()

    sample_service.duration_minutes = 60
    db_session.commit()

    target_date = datetime.date.today() + datetime.timedelta(days=3)
    result = ScheduleService.get_available_slots(
        db=db_session,
        professional_id=sample_professional.id,
        service_id=sample_service.id,
        target_date=target_date,
    )

    # 09:00 to 17:00 in 60m steps = 8 slots
    assert len(result.slots) == 8
    assert result.slots[0].start_time == datetime.datetime.combine(target_date, datetime.time(9, 0))
    assert result.slots[-1].end_time == datetime.datetime.combine(target_date, datetime.time(17, 0))


def test_get_available_slots_excluding_overlapping_appointments(
    db_session: Session,
    sample_professional: Professional,
    sample_service: Service,
    sample_customer: Customer,
):
    """Exclusion of overlapping slots when appointments exist (BOOKED, CONFIRMED block; CANCELLED, NO_SHOW do not)."""
    target_date = datetime.date.today() + datetime.timedelta(days=2)

    # 1. BOOKED appointment at 10:00 - 10:30 (should block 10:00-10:30)
    appt1 = Appointment(
        professional_id=sample_professional.id,
        customer_id=sample_customer.id,
        service_id=sample_service.id,
        start_time=datetime.datetime.combine(target_date, datetime.time(10, 0)),
        end_time=datetime.datetime.combine(target_date, datetime.time(10, 30)),
        status=AppointmentStatus.BOOKED,
        payment_type=PaymentType.AVULSO_LOCAL,
    )
    # 2. CONFIRMED appointment at 14:00 - 15:00 (should block 14:00-14:30 and 14:30-15:00)
    appt2 = Appointment(
        professional_id=sample_professional.id,
        customer_id=sample_customer.id,
        service_id=sample_service.id,
        start_time=datetime.datetime.combine(target_date, datetime.time(14, 0)),
        end_time=datetime.datetime.combine(target_date, datetime.time(15, 0)),
        status=AppointmentStatus.CONFIRMED,
        payment_type=PaymentType.PACKAGE_CREDIT,
    )
    # 3. CANCELLED appointment at 16:00 - 16:30 (should NOT block)
    appt3 = Appointment(
        professional_id=sample_professional.id,
        customer_id=sample_customer.id,
        service_id=sample_service.id,
        start_time=datetime.datetime.combine(target_date, datetime.time(16, 0)),
        end_time=datetime.datetime.combine(target_date, datetime.time(16, 30)),
        status=AppointmentStatus.CANCELLED,
        payment_type=PaymentType.AVULSO_ONLINE,
    )
    # 4. NO_SHOW appointment at 17:00 - 17:30 (should NOT block)
    appt4 = Appointment(
        professional_id=sample_professional.id,
        customer_id=sample_customer.id,
        service_id=sample_service.id,
        start_time=datetime.datetime.combine(target_date, datetime.time(17, 0)),
        end_time=datetime.datetime.combine(target_date, datetime.time(17, 30)),
        status=AppointmentStatus.NO_SHOW,
        payment_type=PaymentType.AVULSO_LOCAL,
    )
    # 5. Other professional's appointment at 11:00 - 11:30 (should NOT block sample_professional)
    other_prof = Professional(name="Outro Barbeiro", is_active=True)
    db_session.add(other_prof)
    db_session.flush()
    appt5 = Appointment(
        professional_id=other_prof.id,
        customer_id=sample_customer.id,
        service_id=sample_service.id,
        start_time=datetime.datetime.combine(target_date, datetime.time(11, 0)),
        end_time=datetime.datetime.combine(target_date, datetime.time(11, 30)),
        status=AppointmentStatus.BOOKED,
        payment_type=PaymentType.AVULSO_LOCAL,
    )
    db_session.add_all([appt1, appt2, appt3, appt4, appt5])
    db_session.commit()

    result = ScheduleService.get_available_slots(
        db=db_session,
        professional_id=sample_professional.id,
        service_id=sample_service.id,
        target_date=target_date,
    )

    # 24 total - 3 blocked (10:00, 14:00, 14:30) = 21 slots
    assert len(result.slots) == 21

    slot_starts = [s.start_time.time() for s in result.slots]
    assert datetime.time(10, 0) not in slot_starts
    assert datetime.time(14, 0) not in slot_starts
    assert datetime.time(14, 30) not in slot_starts

    # 16:00, 17:00, 11:00 must be available
    assert datetime.time(16, 0) in slot_starts
    assert datetime.time(17, 0) in slot_starts
    assert datetime.time(11, 0) in slot_starts


def test_get_available_slots_custom_duration_professional(
    db_session: Session,
    sample_professional: Professional,
    sample_service: Service,
):
    """Respecting custom service duration (45 min) for a specific professional."""
    prof_svc = db_session.query(ProfessionalService).filter_by(
        professional_id=sample_professional.id,
        service_id=sample_service.id,
    ).one()
    prof_svc.custom_duration_minutes = 45
    db_session.commit()

    target_date = datetime.date.today() + datetime.timedelta(days=2)
    result = ScheduleService.get_available_slots(
        db=db_session,
        professional_id=sample_professional.id,
        service_id=sample_service.id,
        target_date=target_date,
    )

    assert result.duration_minutes == 45
    # With 30m slot interval and 45m duration:
    # 08:00-08:45, 08:30-09:15, ..., 19:00-19:45 (19:30-20:15 exceeds 20:00 -> excluded)
    # Total candidates: 23 slots
    assert len(result.slots) == 23
    for s in result.slots:
        assert (s.end_time - s.start_time) == datetime.timedelta(minutes=45)
    assert result.slots[-1].start_time == datetime.datetime.combine(target_date, datetime.time(19, 0))
    assert result.slots[-1].end_time == datetime.datetime.combine(target_date, datetime.time(19, 45))


def test_get_available_slots_today_excludes_past_slots(
    db_session: Session,
    sample_professional: Professional,
    sample_service: Service,
):
    """If target_date == today, exclude slots where slot_start <= now."""
    today = datetime.date.today()
    simulated_now = datetime.datetime.combine(today, datetime.time(11, 15))

    result = ScheduleService.get_available_slots(
        db=db_session,
        professional_id=sample_professional.id,
        service_id=sample_service.id,
        target_date=today,
        now=simulated_now,
    )

    # Slots up to 11:00 (08:00..11:00 = 7 slots) must be excluded
    # First slot available must be 11:30
    slot_starts = [s.start_time.time() for s in result.slots]
    assert datetime.time(11, 0) not in slot_starts
    assert datetime.time(11, 30) in slot_starts
    assert result.slots[0].start_time == datetime.datetime.combine(today, datetime.time(11, 30))


def test_get_available_slots_professional_not_found_or_inactive(
    db_session: Session,
    sample_service: Service,
    sample_professional: Professional,
):
    """Validation errors: 404 for non-existent or inactive professional."""
    target_date = datetime.date.today() + datetime.timedelta(days=1)

    # 1. Non-existent professional
    with pytest.raises(ProfessionalNotFoundError) as exc_info:
        ScheduleService.get_available_slots(
            db=db_session,
            professional_id=99999,
            service_id=sample_service.id,
            target_date=target_date,
        )
    assert exc_info.value.status_code == 404

    # 2. Inactive professional
    sample_professional.is_active = False
    db_session.commit()
    with pytest.raises(ProfessionalNotFoundError) as exc_info:
        ScheduleService.get_available_slots(
            db=db_session,
            professional_id=sample_professional.id,
            service_id=sample_service.id,
            target_date=target_date,
        )
    assert exc_info.value.status_code == 404


def test_get_available_slots_service_not_found_or_inactive(
    db_session: Session,
    sample_professional: Professional,
    sample_service: Service,
):
    """Validation errors: 404 for non-existent or inactive service."""
    target_date = datetime.date.today() + datetime.timedelta(days=1)

    # 1. Non-existent service
    with pytest.raises(ServiceNotFoundError) as exc_info:
        ScheduleService.get_available_slots(
            db=db_session,
            professional_id=sample_professional.id,
            service_id=99999,
            target_date=target_date,
        )
    assert exc_info.value.status_code == 404

    # 2. Inactive service
    sample_service.is_active = False
    db_session.commit()
    with pytest.raises(ServiceNotFoundError) as exc_info:
        ScheduleService.get_available_slots(
            db=db_session,
            professional_id=sample_professional.id,
            service_id=sample_service.id,
            target_date=target_date,
        )
    assert exc_info.value.status_code == 404


def test_api_get_available_slots_success(
    test_client: TestClient,
    sample_professional: Professional,
    sample_service: Service,
):
    """API endpoint GET /api/v1/professionals/{professional_id}/available-slots?service_id=X&date=YYYY-MM-DD."""
    target_date = datetime.date.today() + datetime.timedelta(days=2)
    response = test_client.get(
        f"/api/v1/professionals/{sample_professional.id}/available-slots",
        params={"service_id": sample_service.id, "date": target_date.isoformat()},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["professional_id"] == sample_professional.id
    assert data["service_id"] == sample_service.id
    assert data["date"] == target_date.isoformat()
    assert data["duration_minutes"] == 30
    assert len(data["slots"]) == 24
    assert data["slots"][0]["start_time"] == f"{target_date.isoformat()}T08:00:00"
    assert data["slots"][0]["end_time"] == f"{target_date.isoformat()}T08:30:00"


def test_api_get_available_slots_validation_and_errors(
    test_client: TestClient,
    sample_professional: Professional,
    sample_service: Service,
):
    """API error handling: missing query params, 404 for non-existent entities."""
    target_date = datetime.date.today() + datetime.timedelta(days=2)

    # 1. Missing service_id
    resp_no_svc = test_client.get(
        f"/api/v1/professionals/{sample_professional.id}/available-slots",
        params={"date": target_date.isoformat()},
    )
    assert resp_no_svc.status_code == 422

    # 2. Missing date
    resp_no_date = test_client.get(
        f"/api/v1/professionals/{sample_professional.id}/available-slots",
        params={"service_id": sample_service.id},
    )
    assert resp_no_date.status_code in (400, 422)

    # 3. Non-existent professional (404)
    resp_prof_404 = test_client.get(
        "/api/v1/professionals/99999/available-slots",
        params={"service_id": sample_service.id, "date": target_date.isoformat()},
    )
    assert resp_prof_404.status_code == 404

    # 4. Non-existent service (404)
    resp_svc_404 = test_client.get(
        f"/api/v1/professionals/{sample_professional.id}/available-slots",
        params={"service_id": 99999, "date": target_date.isoformat()},
    )
    assert resp_svc_404.status_code == 404


def test_api_get_available_slots_reflects_booked_appointment(
    test_client: TestClient,
    sample_professional: Professional,
    sample_service: Service,
    sample_customer: Customer,
    db_session: Session,
):
    """API endpoint reflects booked appointment by omitting overlapping slot."""
    target_date = datetime.date.today() + datetime.timedelta(days=2)
    appt = Appointment(
        professional_id=sample_professional.id,
        customer_id=sample_customer.id,
        service_id=sample_service.id,
        start_time=datetime.datetime.combine(target_date, datetime.time(15, 0)),
        end_time=datetime.datetime.combine(target_date, datetime.time(15, 30)),
        status=AppointmentStatus.BOOKED,
        payment_type=PaymentType.AVULSO_LOCAL,
    )
    db_session.add(appt)
    db_session.commit()

    response = test_client.get(
        f"/api/v1/professionals/{sample_professional.id}/available-slots",
        params={"service_id": sample_service.id, "date": target_date.isoformat()},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["slots"]) == 23
    slot_starts = [s["start_time"] for s in data["slots"]]
    assert f"{target_date.isoformat()}T15:00:00" not in slot_starts
