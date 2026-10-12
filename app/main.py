from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all SQLAlchemy models are registered
from app.api.v1 import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    Initializes database tables on application startup.
    """
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SoftBarber - API de Gestão de Barbearia, Pacotes Promocionais e Agendamentos com Crédito",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS) middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint confirming application status and version."""
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


@app.get("/", tags=["root"], include_in_schema=False)
def root():
    """Root endpoint providing basic service info and link to documentation."""
    return {
        "message": f"Bem-vindo ao {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "version": settings.VERSION,
    }


# Mount versioned API routes under /api/v1
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
