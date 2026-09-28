from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.common.dependencies import get_current_user
from app.modules.userauth.models import User
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.service import OrganizationService
from app.modules.organizations.schemas import (
    OrganizationResponse, OrganizationCreate, OrganizationUpdate, OrganizationDetailResponse
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])

def get_org_service(db: AsyncSession = Depends(get_db)) -> OrganizationService:
    repo = OrganizationRepository(db)
    return OrganizationService(repo)

@router.get("/", response_model=list[OrganizationResponse])
async def get_organizations(
    search: str | None = None,
    service: OrganizationService = Depends(get_org_service),
    current_user: User = Depends(get_current_user)
):
    return await service.get_all_organizations(search)

@router.get("/{org_id}", response_model=OrganizationDetailResponse)
async def get_organization(
    org_id: UUID,
    service: OrganizationService = Depends(get_org_service),
    current_user: User = Depends(get_current_user)
):
    org = await service.get_organization(org_id, include_tenders=True)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return org

@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_in: OrganizationCreate,
    service: OrganizationService = Depends(get_org_service),
    current_user: User = Depends(get_current_user)
):
    return await service.create_organization(org_in)

@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    org_in: OrganizationUpdate,
    service: OrganizationService = Depends(get_org_service),
    current_user: User = Depends(get_current_user)
):
    org = await service.update_organization(org_id, org_in)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return org
