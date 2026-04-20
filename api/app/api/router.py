from fastapi import APIRouter

from app.api.routes import accountability, admin, auth, checkin, open_data, ops, reports, sse, whatsapp

api_router = APIRouter(prefix="/v1")
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(ops.router, tags=["ops"])
api_router.include_router(checkin.router, tags=["checkin"])
api_router.include_router(sse.router, tags=["sse"])
api_router.include_router(whatsapp.router, tags=["whatsapp"])
api_router.include_router(accountability.router, tags=["accountability"])
api_router.include_router(open_data.router, prefix="/open-data", tags=["open-data"])
