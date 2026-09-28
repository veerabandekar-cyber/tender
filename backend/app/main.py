"""
ASTTC Public Product Catalogue API — Entry Point
Read-Only API serving product data from local PostgreSQL.
No authentication. No write operations.
"""

import os
import logging
import asyncio
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.modules.catalogue.router import router as catalogue_router
from app.modules.userauth.router import router as auth_router
from app.modules.organizations.router import router as org_router
from app.modules.tenders.router import router as tenders_router
from app.modules.discovery.router import router as discovery_router
from app.modules.reports.router import router as reports_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent

def _runtime_root() -> Path:
    # PyInstaller one-file extracts bundled assets under _MEIPASS.
    return Path(getattr(sys, "_MEIPASS", PROJECT_DIR))

def _frontend_dist() -> Path:
    packaged = _runtime_root() / "frontend_dist"
    if packaged.exists():
        return packaged
    local = PROJECT_DIR / "frontend" / "dist"
    if local.exists():
        return local
    return packaged

static_dir = str(APP_DIR / "static")
frontend_dist = _frontend_dist()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print("=" * 50)
    print(" ASTTC PRODUCT CATALOGUE & TIP API")
    print("=" * 50)
    print(f" Mode: INTERACTIVE READ-WRITE (Local Postgres)")
    print(f" API Prefix: {settings.api_prefix}")
    print(f" CORS Origins: {settings.get_cors_origins}")

    db_url = settings.database_url
    if db_url:
        masked = "***" + db_url[-20:] if len(db_url) > 20 else "***"
        print(f" Database: {masked}")

    print("=" * 50)
    print(" Server started successfully!")
    print("=" * 50)

    # Ensure ORM tables exist for a zero-configuration local demo. Existing production schemas are preserved.
    try:
        from app.database import engine, Base
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified/created.")
    except Exception as exc:
        logger.warning("Could not auto-create database tables: %s", exc)

    # Ensure harmless reference data is present. No tender records are seeded.
    from app.seed import run_seed
    await run_seed()

    # Initialize APScheduler for automated crawling & daily summaries
    scheduler = None
    if settings.scheduler_enabled:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.modules.discovery.service import DiscoveryService
        from app.modules.discovery.repository import DiscoveryRepository
        from app.modules.tenders.repository import TenderRepository
        from app.modules.organizations.repository import OrganizationRepository
        from app.modules.reports.service import ReportsService
        from app.database import async_session_maker

        scheduler = BackgroundScheduler()

        def run_async(coro):
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            return loop.run_until_complete(coro)

        async def scheduled_discovery_and_digest():
            logger.info("Executing scheduled daily tender discovery and summary email digest...")
            async with async_session_maker() as session:
                try:
                    disc_repo = DiscoveryRepository(session)
                    tender_repo = TenderRepository(session)
                    org_repo = OrganizationRepository(session)
                    service = DiscoveryService(disc_repo, tender_repo, org_repo)
                    
                    # Run crawling
                    await service.run_discovery_pipeline()
                    await session.commit()
                    
                    # Dispatch daily summary digest email
                    await ReportsService.send_tender_digest(session, "info@analytica.com")
                    await session.commit()
                except Exception as e:
                    logger.error(f"Error executing scheduled jobs: {e}")

        # Add cron job to run at 1:00 AM daily
        scheduler.add_job(
            lambda: run_async(scheduled_discovery_and_digest()),
            "cron",
            hour=1,
            id="daily_discovery_and_digest"
        )
        scheduler.start()
        logger.info("APScheduler background scheduler started.")

    logger.info("ASTTC Backend API started")
    yield

    # Shutdown events
    if scheduler:
        scheduler.shutdown()
        logger.info("APScheduler background scheduler stopped.")
    print("=" * 50)
    print(" Shutting down Backend API...")
    print("=" * 50)


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Backend API for the ASTTC Tender Intelligence Portal & Product Catalogue.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, PATCH, DELETE, OPTIONS)
    allow_headers=["*"],
)

# Mount the static directory to serve generated PDF files
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include all routers
app.include_router(catalogue_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(org_router, prefix="/api/v1")
app.include_router(tenders_router, prefix="/api/v1")
app.include_router(discovery_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")


# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ASTTC Backend & Tender Intelligence Portal"
    }


# Serve the production React build from FastAPI when present. This removes the
# need for a second Node/Vite process in the packaged Windows demo.
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def frontend_spa(full_path: str):
        requested = frontend_dist / full_path
        if full_path and requested.is_file():
            return FileResponse(str(requested))
        return FileResponse(str(frontend_dist / "index.html"))


# For running standalone / EXE: python -m app.main
if __name__ == "__main__":
    import threading
    import webbrowser
    import time
    import uvicorn

    def _open_browser():
        time.sleep(1.2)
        webbrowser.open("http://127.0.0.1:8000")

    threading.Thread(target=_open_browser, daemon=True).start()

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False,
    )

