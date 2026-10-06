"""
Async SQLAlchemy database connection for local SQLite and PostgreSQL.
Configured with WAL mode, busy timeouts, and connection resilience.
"""

import logging
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Convert database URL to async driver equivalents
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
elif database_url.startswith("sqlite://"):
    database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")

# Create async engine with driver-specific optimizations
is_sqlite = database_url.startswith("sqlite")
engine_kwargs = {
    "echo": settings.debug,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {"timeout": 30.0}
else:
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_async_engine(database_url, **engine_kwargs)

# Enable WAL (Write-Ahead Logging) and busy timeout on SQLite to prevent "database is locked" errors
if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA busy_timeout=15000")
            cursor.close()
        except Exception as e:
            logger.debug("Could not set SQLite pragmas: %s", e)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncSession:
    """
    Dependency that provides a database session.
    Use with FastAPI Depends().
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except BaseException as e:
            try:
                await session.rollback()
            except Exception as re:
                logger.debug("Database rollback error: %s", re)
            if not isinstance(e, GeneratorExit):
                raise
        finally:
            await session.close()


