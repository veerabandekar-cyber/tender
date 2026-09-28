from uuid import UUID
from typing import Sequence, Optional, Tuple
from fastapi import HTTPException, status
from app.modules.tenders.models import Tender, TenderStatus
from app.modules.tenders.repository import TenderRepository
from app.modules.tenders.schemas import TenderCreate, TenderUpdate

from app.common.classifier import classify_instrument

class TenderService:
    """Service layer coordinating business logic for tenders."""
    def __init__(self, repository: TenderRepository):
        self.repository = repository

    async def get_all_tenders(
        self,
        search: Optional[str] = None,
        status_filter: Optional[TenderStatus] = None,
        organization_id: Optional[UUID] = None,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc",
        offset: int = 0,
        limit: int = 100
    ) -> Tuple[Sequence[Tender], int]:
        return await self.repository.get_all(
            search=search,
            status=status_filter,
            organization_id=organization_id,
            sort_by=sort_by,
            sort_order=sort_order,
            offset=offset,
            limit=limit
        )

    async def get_tender(self, tender_id: UUID) -> Tender | None:
        return await self.repository.get_by_id(tender_id)

    async def create_tender(self, tender_in: TenderCreate) -> Tender:
        # Check duplicate tender_number
        existing = await self.repository.get_by_tender_number(tender_in.tender_number)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Tender with number '{tender_in.tender_number}' already exists"
            )
        data = tender_in.model_dump()
        if not data.get("instrument_category") or data.get("instrument_category") == "General":
            data["instrument_category"] = classify_instrument(data.get("title", ""), data.get("department") or "")
        return await self.repository.create(data)

    async def update_tender(self, tender_id: UUID, tender_in: TenderUpdate) -> Tender | None:
        return await self.repository.update(tender_id, tender_in.model_dump(exclude_unset=True))

    async def update_tender_status(self, tender_id: UUID, new_status: TenderStatus) -> Tender | None:
        return await self.repository.update(tender_id, {"status": new_status})

    async def delete_tender(self, tender_id: UUID) -> bool:
        return await self.repository.soft_delete(tender_id)
