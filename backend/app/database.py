"""
Async SQLAlchemy database connection for local PostgreSQL.
Uses asyncpg driver.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Convert database URL to async driver equivalents
database_url = settings.database_url
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
elif database_url.startswith("sqlite://"):
    database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")

# Create async engine
is_sqlite = database_url.startswith("sqlite")
engine = create_async_engine(
    database_url,
    echo=settings.debug,
    pool_pre_ping=not is_sqlite,
)

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
            print("--- get_db: yielding session ---", flush=True)
            yield session
            print("--- get_db: committing session ---", flush=True)
            await session.commit()
            print("--- get_db: commit success ---", flush=True)
        except BaseException as e:
            print(f"--- get_db: exception caught: {type(e)}: {e} ---", flush=True)
            try:
                await session.rollback()
                print("--- get_db: rollback success ---", flush=True)
            except Exception as re:
                print(f"--- get_db: rollback error: {re} ---", flush=True)
            if not isinstance(e, GeneratorExit):
                raise
        finally:
            print("--- get_db: closing session ---", flush=True)
            await session.close()

