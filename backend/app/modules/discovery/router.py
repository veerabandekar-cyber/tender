from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, async_session_maker
from app.common.dependencies import get_current_user
from app.modules.userauth.models import User
from app.modules.discovery.repository import DiscoveryRepository
from app.modules.discovery.service import DiscoveryService
from app.modules.discovery.schemas import (
    SearchKeywordResponse, SearchKeywordCreate, SearchKeywordUpdate, SearchLogResponse
)
from app.modules.tenders.repository import TenderRepository
from app.modules.organizations.repository import OrganizationRepository

router = APIRouter(prefix="/discovery", tags=["Tender Discovery"])

def get_discovery_service(db: AsyncSession = Depends(get_db)) -> DiscoveryService:
    repo = DiscoveryRepository(db)
    tender_repo = TenderRepository(db)
    org_repo = OrganizationRepository(db)
    return DiscoveryService(repo, tender_repo, org_repo)


async def _run_discovery_in_background(log_id: UUID) -> None:
    async with async_session_maker() as session:
        repo = DiscoveryRepository(session)
        tender_repo = TenderRepository(session)
        org_repo = OrganizationRepository(session)
        service = DiscoveryService(repo, tender_repo, org_repo)
        await service.execute_discovery_pipeline(log_id)

# Keyword Endpoints
@router.get("/keywords", response_model=list[SearchKeywordResponse])
async def get_keywords(
    service: DiscoveryService = Depends(get_discovery_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_all_keywords()

@router.post("/keywords", response_model=SearchKeywordResponse, status_code=status.HTTP_201_CREATED)
async def create_keyword(
    kw_in: SearchKeywordCreate,
    service: DiscoveryService = Depends(get_discovery_service),
    current_user: User = Depends(get_current_user)
):
    return await service.create_keyword(kw_in)

@router.patch("/keywords/{keyword_id}", response_model=SearchKeywordResponse)
async def update_keyword(
    keyword_id: UUID,
    kw_in: SearchKeywordUpdate,
    service: DiscoveryService = Depends(get_discovery_service),
    current_user: User = Depends(get_current_user)
):
    kw = await service.update_keyword(keyword_id, kw_in)
    if not kw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search keyword not found."
        )
    return kw

@router.delete("/keywords/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keyword(
    keyword_id: UUID,
    service: DiscoveryService = Depends(get_discovery_service),
    current_user: User = Depends(get_current_user)
):
    success = await service.delete_keyword(keyword_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Search keyword not found."
        )
    return None

# Search Logs Endpoints
@router.get("/logs", response_model=list[SearchLogResponse])
async def get_logs(
    limit: int = 50,
    offset: int = 0,
    service: DiscoveryService = Depends(get_discovery_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_search_logs(limit, offset)

# Pipeline trigger Endpoint
@router.post("/run", response_model=SearchLogResponse)
async def run_discovery(
    background_tasks: BackgroundTasks,
    sync: bool = Query(False, description="Run synchronously if True"),
    service: DiscoveryService = Depends(get_discovery_service),
    current_user: User = Depends(get_current_user)
):
    if sync:
        return await service.run_discovery_pipeline()

    search_log = await service.create_initial_log()
    background_tasks.add_task(_run_discovery_in_background, search_log.id)
    return search_log
