-- ================================================
-- SalesConnect Database Schema
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Create sectors table
CREATE TABLE IF NOT EXISTS sectors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  country TEXT,
  product_focus TEXT,
  logo TEXT,
  sector_id TEXT REFERENCES sectors(id),
  industry TEXT,
  data_source TEXT CHECK (data_source IN ('public', 'imported', 'manual')) DEFAULT 'imported',
  address TEXT,
  notes TEXT,
  membership_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  email TEXT,
  phone TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector_id);
CREATE INDEX IF NOT EXISTS idx_companies_data_source ON companies(data_source);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);

-- 5. Seed initial sectors
INSERT INTO sectors (id, name, icon, description) VALUES
  ('fmcg', 'FMCG', 'ShoppingCart', 'Fast Moving Consumer Goods'),
  ('pharma', 'Pharmaceuticals', 'Pill', 'Pharmaceutical & Healthcare'),
  ('textiles', 'Textiles', 'Shirt', 'Textile & Apparel Industry'),
  ('cosmetics', 'Cosmetics', 'Sparkles', 'Beauty & Personal Care'),
  ('food', 'Food & Beverage', 'UtensilsCrossed', 'Food Processing & Beverages')
ON CONFLICT (id) DO NOTHING;

-- 6. Enable Row Level Security
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for public read access (anon users)
CREATE POLICY "Allow public read sectors" ON sectors FOR SELECT USING (true);
CREATE POLICY "Allow public read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Allow public read contacts" ON contacts FOR SELECT USING (true);

-- 8. Create policies for insert/update (anon users for MVP)
CREATE POLICY "Allow anon insert companies" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert contacts" ON contacts FOR INSERT WITH CHECK (true);

-- Done!
SELECT 'Database setup complete!' as status;
