"""
Repository layer for read-only database access.
Contains only GET operations — no writes allowed.
"""

from uuid import UUID
from typing import Sequence
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.modules.catalogue.models import ProductProvider, ProductCategory, CatalogueProduct


class CatalogueRepository:
    """Read-only repository for the public product catalogue."""
    
    def __init__(self, session: AsyncSession):
        self.session = session

    # ============== Provider Methods ==============

    async def get_all_providers(self) -> Sequence[ProductProvider]:
        result = await self.session.execute(
            select(ProductProvider).order_by(ProductProvider.name)
        )
        return result.scalars().all()

    # ============== Category Methods ==============

    async def get_all_categories(self) -> Sequence[ProductCategory]:
        result = await self.session.execute(
            select(ProductCategory).order_by(ProductCategory.display_order)
        )
        return result.scalars().all()

    # ============== Product Methods ==============

    async def get_product_by_id(self, product_id: UUID) -> CatalogueProduct | None:
        result = await self.session.execute(
            select(CatalogueProduct)
            .options(
                selectinload(CatalogueProduct.category),
                selectinload(CatalogueProduct.provider),
            )
            .where(CatalogueProduct.id == product_id)
            .where(CatalogueProduct.is_active == True)
            .where(CatalogueProduct.is_upcoming == False)
        )
        return result.scalar_one_or_none()

    async def get_all_products(
        self,
        category_id: UUID | None = None,
        provider_id: UUID | None = None,
        search: str | None = None,
    ) -> tuple[Sequence[CatalogueProduct], int]:
        """Fetch active products with optional filters and search."""
        query = (
            select(CatalogueProduct)
            .options(
                selectinload(CatalogueProduct.category),
                selectinload(CatalogueProduct.provider),
            )
            .where(CatalogueProduct.is_active == True)
            .where(CatalogueProduct.is_upcoming == False)
        )
        count_query = select(func.count(CatalogueProduct.id)).where(
            CatalogueProduct.is_active == True
        )

        if category_id:
            query = query.where(CatalogueProduct.category_id == category_id)
            count_query = count_query.where(CatalogueProduct.category_id == category_id)

        if provider_id:
            query = query.where(CatalogueProduct.provider_id == provider_id)
            count_query = count_query.where(CatalogueProduct.provider_id == provider_id)

        if search:
            search_filter = or_(
                CatalogueProduct.name.ilike(f"%{search}%"),
                CatalogueProduct.short_description.ilike(f"%{search}%"),
                CatalogueProduct.type.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        count_result = await self.session.execute(count_query)
        total = count_result.scalar() or 0

        query = query.order_by(CatalogueProduct.created_at.desc())
        result = await self.session.execute(query)
        products = result.scalars().all()

        return products, total

        return products, total  # ← last line of get_all_products

    async def get_upcoming_products(self) -> tuple[Sequence[CatalogueProduct], int]:
        """Fetch upcoming products."""
        query = (
            select(CatalogueProduct)
            .options(
                selectinload(CatalogueProduct.category),
                selectinload(CatalogueProduct.provider),
            )
            .where(CatalogueProduct.is_upcoming == True)
            .where(CatalogueProduct.is_active == True)
            .order_by(CatalogueProduct.name)
        )
        count_query = select(func.count(CatalogueProduct.id)).where(
            CatalogueProduct.is_upcoming == True
        )
        count_result = await self.session.execute(count_query)
        total = count_result.scalar() or 0
        result = await self.session.execute(query)
        products = result.scalars().all()
        return products, total
