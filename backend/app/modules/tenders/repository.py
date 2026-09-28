from uuid import UUID
from typing import Sequence, Optional

from sqlalchemy import select, func, or_, String, cast
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.tenders.models import Tender, TenderStatus


class TenderRepository:
    """Repository for database operations on tenders."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: dict) -> Tender:
        tender = Tender(**data)
        self.session.add(tender)
        await self.session.flush()
        await self.session.refresh(tender)
        return tender

    async def get_by_id(self, tender_id: UUID) -> Tender | None:
        query = (
            select(Tender)
            .where(Tender.id == tender_id)
            .where(Tender.is_active == True)
            .options(selectinload(Tender.organization))
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_tender_number(
        self,
        tender_number: str
    ) -> Tender | None:
        query = (
            select(Tender)
            .where(Tender.tender_number == tender_number)
            .where(Tender.is_active == True)
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        search: Optional[str] = None,
        status: Optional[TenderStatus] = None,
        organization_id: Optional[UUID] = None,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc",
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Tender], int]:

        # Prevent unreasonable requests from overwhelming the server.
        offset = max(0, offset)
        limit = max(1, min(limit, 100))

        query = (
            select(Tender)
            .where(Tender.is_active == True)
            .options(selectinload(Tender.organization))
        )

        count_query = (
            select(func.count())
            .select_from(Tender)
            .where(Tender.is_active == True)
        )

        filters = []

        # ============================================================
        # SEARCH
        # ============================================================
        #
        # Search the actual database columns AND raw extracted data.
        #
        # This is important because terms such as "spectrometer" may
        # exist in raw_extracted_data rather than the normal title field.
        #
        if search:
            words = [w for w in search.strip().lower().split() if w]
            for word in words:
                search_pattern = f"%{word}%"
                search_filter = or_(
                    func.lower(Tender.tender_number).like(search_pattern),
                    func.lower(Tender.title).like(search_pattern),
                    func.lower(Tender.department).like(search_pattern),
                    func.lower(Tender.instrument_category).like(search_pattern),
                    func.lower(Tender.contact_person).like(search_pattern),
                    func.lower(Tender.portal).like(search_pattern),
                    func.lower(
                        cast(Tender.raw_extracted_data, String)
                    ).like(search_pattern),
                )
                filters.append(search_filter)

        # ============================================================
        # STATUS FILTER
        # ============================================================
        if status:
            filters.append(Tender.status == status)

        # ============================================================
        # ORGANIZATION FILTER
        # ============================================================
        if organization_id:
            filters.append(
                Tender.organization_id == organization_id
            )

        # ============================================================
        # APPLY FILTERS
        # ============================================================
        for condition in filters:
            query = query.where(condition)
            count_query = count_query.where(condition)

        # ============================================================
        # SAFE SORTING
        # ============================================================
        allowed_sort_columns = {
            "created_at": Tender.created_at,
            "updated_at": Tender.updated_at,
            "title": Tender.title,
            "tender_number": Tender.tender_number,
            "bid_closing_date": Tender.bid_closing_date,
            "tender_value": Tender.tender_value,
            "portal": Tender.portal,
        }

        sort_column = allowed_sort_columns.get(
            sort_by or "created_at",
            Tender.created_at,
        )

        if sort_order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Always provide deterministic ordering when dates/values tie.
        query = query.order_by(Tender.id)

        # ============================================================
        # PAGINATION
        # ============================================================
        query = query.offset(offset).limit(limit)

        # ============================================================
        # EXECUTE DATA QUERY
        # ============================================================
        tenders_result = await self.session.execute(query)
        tenders = tenders_result.scalars().all()

        # ============================================================
        # EXECUTE COUNT QUERY
        # ============================================================
        count_result = await self.session.execute(count_query)
        total = count_result.scalar_one() or 0

        return tenders, total

    async def update(
        self,
        tender_id: UUID,
        data: dict
    ) -> Tender | None:

        tender = await self.get_by_id(tender_id)

        if not tender:
            return None

        for key, value in data.items():
            setattr(tender, key, value)

        await self.session.flush()
        await self.session.refresh(tender)

        return tender

    async def soft_delete(
        self,
        tender_id: UUID
    ) -> bool:

        tender = await self.get_by_id(tender_id)

        if not tender:
            return False

        tender.is_active = False

        await self.session.flush()

        return True