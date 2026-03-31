from app.domains.health.router import router as health_router
from app.domains.auth.router import router as auth_router
from app.domains.users.router import router as users_router
from app.domains.devices.router import router as devices_router
from app.domains.children.router import router as children_router
from app.domains.reports.router import router as reports_router
from app.domains.sse.router import router as sse_router


from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(devices_router)
api_router.include_router(children_router)
api_router.include_router(reports_router)
api_router.include_router(sse_router)
