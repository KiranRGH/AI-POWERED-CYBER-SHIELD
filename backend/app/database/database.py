import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

def _create_resilient_engine():
    url = settings.DATABASE_URL
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

    # First attempt: Try connecting to configured DATABASE_URL (PostgreSQL)
    try:
        eng = create_engine(
            url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        # Test connection immediately
        with eng.connect() as conn:
            pass
        logger.info("[DATABASE] Connected successfully to PostgreSQL.")
        return eng
    except Exception as e:
        logger.warning(
            f"[DATABASE] Could not connect to PostgreSQL ({e}). "
            f"Falling back to local development database (cyber_threat_dev.db)."
        )

    # Second attempt: Seamless local SQLite development fallback
    sqlite_url = "sqlite:///./cyber_threat_dev.db"
    eng = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False}
    )
    return eng

engine = _create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
