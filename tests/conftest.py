import os
os.environ["DATABASE_URL"] = "sqlite:///./softbarber_test.db"

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import Base
import app.models  # Register all models with Base.metadata


@pytest.fixture(scope="session")
def test_engine():
    """Session-scoped SQLite in-memory engine using StaticPool."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(test_engine):
    """Function-scoped database session fixture with transaction rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=connection,
        class_=Session,
        expire_on_commit=False,
    )
    session = TestingSessionLocal()
    
    yield session
    
    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()

