from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.common.dependencies import get_current_user
from app.modules.userauth.models import User
from app.modules.tenders.models import Tender, TenderStatus
from app.modules.tenders.repository import TenderRepository
from app.modules.tenders.service import TenderService
from app.modules.tenders.schemas import (
    TenderResponse,
    TenderCreate,
    TenderUpdate,
    TenderListResponse,
)


router = APIRouter(prefix="/tenders", tags=["Tenders"])


class StatusUpdateSchema(BaseModel):
    status: TenderStatus


def get_tender_service(
    db: AsyncSession = Depends(get_db),
) -> TenderService:
    repo = TenderRepository(db)
    return TenderService(repo)


@router.get("/", response_model=TenderListResponse)
async def get_tenders(
    search: str | None = None,
    status_filter: TenderStatus | None = Query(
        None,
        alias="status",
    ),
    organization_id: UUID | None = None,
    sort_by: str | None = "created_at",
    sort_order: str | None = "desc",
    offset: int = 0,
    limit: int = 100,
    service: TenderService = Depends(get_tender_service),
    current_user: User = Depends(get_current_user),
):
    items, total = await service.get_all_tenders(
        search=search,
        status_filter=status_filter,
        organization_id=organization_id,
        sort_by=sort_by,
        sort_order=sort_order,
        offset=offset,
        limit=limit,
    )

    return {
        "items": items,
        "total": total,
    }


# TEMPORARY DEBUG ENDPOINT
# This checks exactly which database the running API is using.
@router.get("/debug/search")
async def debug_search(
    search: str = "spectrometer",
    db: AsyncSession = Depends(get_db),
):
    database_total = await db.scalar(
        select(func.count()).select_from(Tender)
    )

    database_active = await db.scalar(
        select(func.count())
        .select_from(Tender)
        .where(Tender.is_active == True)
    )

    title_matches = await db.scalar(
        select(func.count())
        .select_from(Tender)
        .where(Tender.is_active == True)
        .where(
            Tender.title.ilike(f"%{search}%")
        )
    )

    return {
        "database_total": database_total or 0,
        "database_active": database_active or 0,
        "title_matches": title_matches or 0,
    }


@router.get("/{tender_id}", response_model=TenderResponse)
async def get_tender(
    tender_id: UUID,
    service: TenderService = Depends(get_tender_service),
    current_user: User = Depends(get_current_user),
):
    tender = await service.get_tender(tender_id)

    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender not found",
        )

    return tender


@router.post(
    "/",
    response_model=TenderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tender(
    tender_in: TenderCreate,
    service: TenderService = Depends(get_tender_service),
    current_user: User = Depends(get_current_user),
):
    return await service.create_tender(tender_in)


@router.patch(
    "/{tender_id}",
    response_model=TenderResponse,
)
async def update_tender(
    tender_id: UUID,
    tender_in: TenderUpdate,
    service: TenderService = Depends(get_tender_service),
    current_user: User = Depends(get_current_user),
):
    tender = await service.update_tender(
        tender_id,
        tender_in,
    )

    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender not found",
        )

    return tender


@router.patch(
    "/{tender_id}/status",
    response_model=TenderResponse,
)
async def update_tender_status(
    tender_id: UUID,
    status_update: StatusUpdateSchema,
    service: TenderService = Depends(get_tender_service),
    current_user: User = Depends(get_current_user),
):
    tender = await service.update_tender_status(
        tender_id,
        status_update.status,
    )

    if not tender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender not found",
        )

    return tender


@router.delete(
    "/{tender_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_tender(
    tender_id: UUID,
    service: TenderService = Depends(get_tender_service),
    current_user: User = Depends(get_current_user),
):
    success = await service.delete_tender(tender_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tender not found",
        )

    return None