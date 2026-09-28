"""
Public API Router — Read-Only Endpoints.
No authentication required. No POST/PATCH/DELETE allowed.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.modules.catalogue.repository import CatalogueRepository
from app.modules.catalogue.service import CatalogueService
from app.modules.catalogue.schemas import (
    ProductResponse, ProductListResponse,
    CategoryResponse, ProviderResponse,
)

router = APIRouter(prefix="/catalogue", tags=["Public Product Catalogue"])


def get_catalogue_service(db: AsyncSession = Depends(get_db)) -> CatalogueService:
    repository = CatalogueRepository(db)
    return CatalogueService(repository)


# ============== Product Endpoints (GET Only) ==============

@router.get("/products/upcoming", response_model=ProductListResponse)
async def get_upcoming_products(
    service: CatalogueService = Depends(get_catalogue_service),
):
    """List all upcoming products."""
    products, total = await service.get_upcoming_products()
    return {"items": products, "total": total}

@router.get("/products", response_model=ProductListResponse)
async def get_products(
    category_id: UUID | None = Query(None),
    provider_id: UUID | None = Query(None),
    search: str | None = Query(None),
    service: CatalogueService = Depends(get_catalogue_service),
):
    """List all active products with optional filtering."""
    products, total = await service.get_all_products(category_id, provider_id, search)
    return {"items": products, "total": total}

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    service: CatalogueService = Depends(get_catalogue_service),
):
    """Get a single product by ID."""
    product = await service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ============== Category Endpoints (GET Only) ==============

@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories(
    service: CatalogueService = Depends(get_catalogue_service),
):
    """List all product categories."""
    return await service.get_all_categories()


# ============== Provider Endpoints (GET Only) ==============

@router.get("/providers", response_model=list[ProviderResponse])
async def get_providers(
    service: CatalogueService = Depends(get_catalogue_service),
):
    """List all product providers."""
    return await service.get_all_providers()

