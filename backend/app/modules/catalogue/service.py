"""
Service layer for public catalogue business logic.
Read-only: no mutations allowed.
"""

from uuid import UUID
from typing import Sequence
from app.modules.catalogue.repository import CatalogueRepository
from app.modules.catalogue.models import CatalogueProduct, ProductProvider, ProductCategory


class CatalogueService:
    """Read-only service for the public product catalogue."""
    
    def __init__(self, repository: CatalogueRepository):
        self.repository = repository

    async def get_all_products(
        self,
        category_id: UUID | None = None,
        provider_id: UUID | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[CatalogueProduct], int]:
        return await self.repository.get_all_products(category_id, provider_id, search)

    async def get_product(self, product_id: UUID) -> CatalogueProduct | None:
        return await self.repository.get_product_by_id(product_id)

    async def get_all_categories(self) -> Sequence[ProductCategory]:
        return await self.repository.get_all_categories()

    async def get_all_providers(self) -> Sequence[ProductProvider]:
        return await self.repository.get_all_providers()
    async def get_upcoming_products(self) -> tuple[Sequence[CatalogueProduct], int]:
        return await self.repository.get_upcoming_products()