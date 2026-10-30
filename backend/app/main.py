import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.rate_limiter import setup_rate_limiter
from app.api import (
    auth, threats, users, dashboard, monitoring, firewall, geolocation,
    analytics, notifications, reports, audit, settings as app_settings,
    system_health, admin, security_sessions, subscriptions, support, models as app_models, roles,
    students_attendance, cyber_crimes
)
from app.database.database import engine, Base

logger = logging.getLogger("uvicorn.error")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Tables (For dev, otherwise use Alembic)
    try:
        Base.metadata.create_all(bind=engine)
        # Resilient SQLite column verification for dev database
        if "sqlite" in str(engine.url):
            from sqlalchemy import text
            with engine.connect() as conn:
                for col_name, col_type in [
                    ("unblock_requested", "BOOLEAN DEFAULT 0"),
                    ("unblock_reason", "TEXT"),
                    ("unblock_requested_at", "TIMESTAMP")
                ]:
                    try:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    except Exception:
                        pass
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.warning(f"Database connection deferred: {e}. Ensure PostgreSQL is running with credentials from .env.")
    yield

app = FastAPI(
    title="AI Cyber Threat Defense API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_rate_limiter(app)

# Include all routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(threats.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(monitoring.router, prefix="/api/v1")
app.include_router(firewall.router, prefix="/api/v1")
app.include_router(geolocation.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(app_settings.router, prefix="/api/v1")
app.include_router(system_health.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(security_sessions.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(support.router, prefix="/api/v1")
app.include_router(app_models.router, prefix="/api/v1")
app.include_router(roles.router, prefix="/api/v1")
app.include_router(students_attendance.router, prefix="/api/v1")
app.include_router(cyber_crimes.router, prefix="/api/v1")

@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "environment": settings.APP_ENV}
