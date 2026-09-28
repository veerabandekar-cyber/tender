import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import get_settings

settings = get_settings()
database_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(database_url)
    async with engine.begin() as conn:
        await conn.execute(text("""
        INSERT INTO public.product_categories VALUES (
        'd1a2b3c4-e5f6-7890-abcd-ef1234567890', 
        'Software Solutions', 9, 
        '2026-06-03 00:00:00.000000+05:30', 
        '2026-06-03 00:00:00.000000+05:30'
        ) ON CONFLICT DO NOTHING;
        """))

        await conn.execute(text("""
        INSERT INTO public.catalogue_products VALUES (
        'a1b2c3d4-e5f6-7890-abcd-ef1234567891', 
        'Sales Intelligence Assistance (SIA)', 
        'Software Product', 
        'd1a2b3c4-e5f6-7890-abcd-ef1234567890', 
        '74e49e04-6440-4538-957c-2a1272c7f511', 
        '/product_images/sia-dashboard.png', 
        '["/product_images/sia-workflow.png"]', 
        NULL, 
        'AI-assisted sales enablement and product recommendation platform for analytical instrument businesses.', 
        'Sales Intelligence Assistance (SIA) is an AI-assisted sales enablement and product recommendation platform designed for analytical instrument businesses. The platform helps sales teams identify target industries, explore company product portfolios, understand testing requirements, recommend suitable analytical instruments, discover key decision-makers, and initiate contextual outreach. SIA transforms industry knowledge into a structured and repeatable sales workflow, enabling faster instrument recommendation, improved lead qualification, and stronger sales efficiency.', 
        '["Sales Enablement", "Business Development", "Product Recommendation", "Lead Qualification", "Customer Research", "Market Intelligence", "Pre-Sales Support"]', 
        '["Pharmaceutical", "Chemical", "FMCG", "Food & Beverage", "Cosmetics", "Petroleum", "Textile", "Steel", "Power", "Research & Academia"]', 
        '["AI-assisted sales enablement platform", "Industry-to-instrument recommendation workflow", "Product-to-testing requirement mapping", "Intelligent instrument recommendation engine", "Leadership and contact intelligence support", "RAG-enabled contextual assistance", "CRM-ready architecture", "Analytics and reporting support"]', 
        '["Sector-based company discovery", "Company product portfolio exploration", "Testing requirement identification", "Instrument recommendation workflow", "AI-assisted sales justification", "Leadership and contact intelligence", "Contextual outreach assistance", "Future CRM integration support"]', 
        '[]', 
        'Price on Request', 'INR', true, 
        '2026-06-03 00:00:00.000000+05:30', 
        '2026-06-03 00:00:00.000000+05:30'
        ) ON CONFLICT DO NOTHING;
        """))
    await engine.dispose()
    print("Inserted seed data successfully.")

if __name__ == "__main__":
    asyncio.run(main())
