-- Initialize Catalogue Database Schema
-- Creates all required tables for the Product Catalogue API

-- Product Providers Table
CREATE TABLE IF NOT EXISTS product_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    website_url VARCHAR(500),
    country VARCHAR(100),
    description TEXT,
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for product_providers
CREATE INDEX IF NOT EXISTS idx_product_providers_name ON product_providers(name);

-- Product Categories Table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON product_categories(name);

-- Catalogue Products Table
CREATE TABLE IF NOT EXISTS catalogue_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    type VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    provider_id UUID REFERENCES product_providers(id) ON DELETE SET NULL,
    image_url VARCHAR,
    additional_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    video_url VARCHAR,
    short_description TEXT,
    detailed_description TEXT,
    applications JSONB NOT NULL DEFAULT '[]'::jsonb,
    industries JSONB NOT NULL DEFAULT '[]'::jsonb,
    technical_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    key_features JSONB NOT NULL DEFAULT '[]'::jsonb,
    test_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    price_range VARCHAR(255) NOT NULL DEFAULT 'Price on Request',
    price_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for catalogue_products
CREATE INDEX IF NOT EXISTS idx_catalogue_products_name ON catalogue_products(name);
CREATE INDEX IF NOT EXISTS idx_catalogue_products_category_id ON catalogue_products(category_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_products_provider_id ON catalogue_products(provider_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_products_is_active ON catalogue_products(is_active);

-- Insert sample data for testing (optional)
INSERT INTO product_categories (id, name, display_order) VALUES
    (gen_random_uuid(), 'Testing Equipment', 1),
    (gen_random_uuid(), 'Instruments', 2),
    (gen_random_uuid(), 'Sensors', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_providers (id, name, country) VALUES
    (gen_random_uuid(), 'Analytica Softtech', 'India'),
    (gen_random_uuid(), 'Global Instruments Inc', 'USA')
ON CONFLICT DO NOTHING;
