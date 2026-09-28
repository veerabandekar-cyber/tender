"""
Pydantic schemas for the public Product Catalogue API.
Read-only: no Create/Update schemas needed.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


# ============== Provider Schemas ==============

class ProviderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    website_url: str | None = None
    country: str | None = None
    description: str | None = None
    logo_url: str | None = None


# ============== Category Schemas ==============

class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    display_order: int = 0


# ============== Product Schemas ==============

class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    type: str
    category_id: UUID
    provider_id: UUID | None = None
    image_url: str | None = None
    additional_images: list[str] = Field(default_factory=list)
    video_url: str | None = None
    short_description: str | None = None
    detailed_description: str | None = None
    applications: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    technical_highlights: list[str] = Field(default_factory=list)
    key_features: list[str] = Field(default_factory=list)
    test_types: list[str] = Field(default_factory=list)
    price_range: str = "Price on Request"
    price_currency: str = "INR"
    is_active: bool = True
    is_upcoming: bool = False
    created_at: datetime
    updated_at: datetime

    # Nested relations for rich UI display
    category: CategoryResponse | None = None
    provider: ProviderResponse | None = None


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
