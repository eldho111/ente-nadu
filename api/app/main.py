import time
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging

settings = get_settings()

# ── Initialize structured logging at module load ──
setup_logging(
    json_output=(settings.env != "development"),
    log_level="DEBUG" if settings.env == "development" else "INFO",
)
logger = structlog.get_logger("api")

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri=settings.redis_url,
)

app = FastAPI(title=f"{settings.app_name} API", version="0.1.0")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please slow down."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Device-Id", "X-Admin-Api-Key"],
)


@app.middleware("http")
async def add_security_and_logging(request: Request, call_next) -> Response:
    request_id = str(uuid4())[:8]
    start = time.monotonic()

    # Bind request_id to structlog context so all downstream logs include it
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    response = await call_next(request)

    duration_ms = round((time.monotonic() - start) * 1000, 1)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["X-Request-Id"] = request_id

    # Structured access log
    logger.info(
        "request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
        client=get_remote_address(request),
    )

    return response


@app.get("/health")
def health() -> dict:
    """Health check that verifies DB and Redis connectivity."""
    checks: dict[str, str] = {}
    healthy = True

    # Check PostgreSQL
    try:
        from app.db.session import engine
        from sqlalchemy import text as sa_text

        with engine.connect() as conn:
            conn.execute(sa_text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as exc:
        checks["postgres"] = f"error: {type(exc).__name__}"
        healthy = False

    # Check Redis
    try:
        import redis

        r = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        r.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {type(exc).__name__}"
        healthy = False

    if not healthy:
        from fastapi.responses import JSONResponse as _JSONResponse

        return _JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "checks": checks},
        )
    return {"status": "ok", "checks": checks}


@app.get("/health/ai")
def health_ai() -> dict:
    """Check if AI classification keys are configured."""
    return {
        "gemini_configured": bool(settings.gemini_api_key),
        "gemini_key_prefix": settings.gemini_api_key[:8] + "..." if settings.gemini_api_key else None,
        "gemini_model": settings.gemini_model if settings.gemini_api_key else None,
        "openai_configured": bool(settings.openai_api_key),
    }


app.include_router(api_router)
