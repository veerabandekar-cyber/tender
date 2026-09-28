from uuid import UUID
from typing import Sequence
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.organizations.models import Organization

class OrganizationRepository:
    """Repository for database operations on organizations."""
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, data: dict) -> Organization:
        org = Organization(**data)
        self.session.add(org)
        await self.session.flush()
        await self.session.refresh(org)
        return org

    async def get_by_id(self, org_id: UUID, include_tenders: bool = False) -> Organization | None:
        query = select(Organization).where(Organization.id == org_id)
        if include_tenders:
            query = query.options(selectinload(Organization.tenders))
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Organization | None:
        result = await self.session.execute(
            select(Organization).where(Organization.name == name)
        )
        return result.scalar_one_or_none()

    async def get_all(self, search: str | None = None) -> Sequence[Organization]:
        query = select(Organization)
        if search:
            search_filter = Organization.name.ilike(f"%{search}%") | Organization.city.ilike(f"%{search}%")
            query = query.where(search_filter)
        query = query.order_by(Organization.name.asc())
        result = await self.session.execute(query)
        return result.scalars().all()

    async def update(self, org_id: UUID, data: dict) -> Organization | None:
        org = await self.get_by_id(org_id)
        if not org:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(org, key, value)
        await self.session.flush()
        await self.session.refresh(org)
        return org
