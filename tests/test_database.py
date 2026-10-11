import inspect
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import Base, engine, get_db, SessionLocal


def test_settings_default_values():
    """Validates default configuration settings."""
    assert settings.DATABASE_URL is not None
    assert isinstance(settings.BUSINESS_NAME, str)
    assert settings.CANCELLATION_WINDOW_HOURS >= 0
    assert settings.DEFAULT_SLOT_INTERVAL_MINUTES > 0
    assert settings.OPEN_TIME is not None
    assert settings.CLOSE_TIME is not None


def test_database_base_and_engine():
    """Validates DeclarativeBase and engine instances."""
    assert Base is not None
    assert engine is not None
    assert SessionLocal is not None


def test_get_db_session_yield():
    """Validates that get_db yields an active SQLAlchemy Session and closes it."""
    assert inspect.isgeneratorfunction(get_db)
    
    db_generator = get_db()
    db_session = next(db_generator)
    
    try:
        assert isinstance(db_session, Session)
        result = db_session.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        # Finish generator to trigger finally block / close session
        try:
            next(db_generator)
        except StopIteration:
            pass


def test_conftest_db_session_fixture(db_session: Session):
    """Validates that conftest fixture db_session provides an active session."""
    assert isinstance(db_session, Session)
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1

