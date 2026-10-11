from fastapi import APIRouter
from app.api.v1.packages import router as packages_router
from app.api.v1.appointments import router as appointments_router

api_v1_router = APIRouter()
api_v1_router.include_router(packages_router)
api_v1_router.include_router(appointments_router)

__all__ = ["api_v1_router", "packages_router", "appointments_router"]

