from uuid import UUID
from typing import Sequence
from fastapi import HTTPException, status
from app.modules.organizations.models import Organization
from app.modules.organizations.repository import OrganizationRepository
from app.modules.organizations.schemas import OrganizationCreate, OrganizationUpdate

class OrganizationService:
    """Service layer coordinating business logic for organizations."""
    def __init__(self, repository: OrganizationRepository):
        self.repository = repository

    async def get_all_organizations(self, search: str | None = None) -> Sequence[Organization]:
        return await self.repository.get_all(search)

    async def get_organization(self, org_id: UUID, include_tenders: bool = False) -> Organization | None:
        return await self.repository.get_by_id(org_id, include_tenders)

    async def create_organization(self, org_in: OrganizationCreate) -> Organization:
        # Check duplicate name
        existing = await self.repository.get_by_name(org_in.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Organization with name '{org_in.name}' already exists"
            )
        return await self.repository.create(org_in.model_dump())

    async def update_organization(self, org_id: UUID, org_in: OrganizationUpdate) -> Organization | None:
        if org_in.name:
            existing = await self.repository.get_by_name(org_in.name)
            if existing and existing.id != org_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Organization with name '{org_in.name}' already exists"
                )
        return await self.repository.update(org_id, org_in.model_dump(exclude_unset=True))
