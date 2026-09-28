import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.modules.userauth.models import User
from app.modules.userauth.service import AuthService
from app.modules.organizations.models import Organization
from app.modules.discovery.models import SearchKeyword

# Use in-memory SQLite database for testing
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Creates a session-scoped event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

# Create test engine using StaticPool to keep connection alive in-memory across calls
test_engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
)

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db() -> AsyncGenerator[None, None]:
    """Creates all database tables before running each test case and drops them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a database session for direct test assertions/seeding."""
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an async client configured to override the db dependency with the test database."""
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest_asyncio.fixture(scope="function")
async def seed_admin(db_session: AsyncSession) -> User:
    """Seeds a default administrator user for auth test scenarios."""
    hashed = AuthService.hash_password("adminpass")
    admin = User(
        email="admin@analyticasofttech.com",
        password_hash=hashed,
        first_name="Admin",
        last_name="Analytica",
        role="Administrator",
        is_active=True
    )
    db_session.add(admin)
    await db_session.flush()
    await db_session.commit()
    return admin

@pytest_asyncio.fixture(scope="function")
async def admin_auth_headers(client: AsyncClient, seed_admin: User) -> dict[str, str]:
    """Helper returning Bearer authorization headers for the seeded admin user."""
    # Obtain token directly using service/auth method
    token = AuthService.create_access_token(str(seed_admin.id))
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture(scope="function")
async def seed_organization(db_session: AsyncSession) -> Organization:
    """Seeds a sample buyer organization for tender tests."""
    org = Organization(
        name="Bhabha Atomic Research Centre",
        type="Research Lab",
        category="DAE",
        city="Mumbai",
        state="Maharashtra"
    )
    db_session.add(org)
    await db_session.flush()
    await db_session.commit()
    return org
