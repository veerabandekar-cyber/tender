"""
SQLAlchemy ORM models for the Product Catalogue.
These map to the catalogue tables in the local PostgreSQL database.
This app reads them in read-only mode for public access.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base


class ProductProvider(Base):
    """Instrument manufacturers/providers."""
    __tablename__ = "product_providers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    products: Mapped[list["CatalogueProduct"]] = relationship("CatalogueProduct", back_populates="provider")

    def __repr__(self) -> str:
        return f"<ProductProvider(id={self.id}, name='{self.name}')>"


class ProductCategory(Base):
    """Product categories for grouping instruments."""
    __tablename__ = "product_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    products: Mapped[list["CatalogueProduct"]] = relationship("CatalogueProduct", back_populates="category")

    def __repr__(self) -> str:
        return f"<ProductCategory(id={self.id}, name='{self.name}')>"


class CatalogueProduct(Base):
    """Product details."""
    __tablename__ = "catalogue_products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(255), nullable=False)

    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_categories.id"), nullable=False, index=True)
    provider_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("product_providers.id"), nullable=True, index=True)

    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    additional_images: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    detailed_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    applications: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    industries: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    technical_highlights: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    key_features: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    test_types: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    price_range: Mapped[str] = mapped_column(String(255), nullable=False, default="Price on Request")
    price_currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")

    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    is_upcoming: Mapped[bool] = mapped_column(nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    category: Mapped["ProductCategory"] = relationship("ProductCategory", back_populates="products")
    provider: Mapped["ProductProvider | None"] = relationship("ProductProvider", back_populates="products")

    def __repr__(self) -> str:
        return f"<CatalogueProduct(id={self.id}, name='{self.name}')>"
