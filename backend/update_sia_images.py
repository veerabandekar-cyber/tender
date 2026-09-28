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
        UPDATE public.catalogue_products 
        SET 
            image_url = '/product_images/sia-main.png',
            additional_images = '["/product_images/sia-2.png", "/product_images/sia-3.png", "/product_images/sia-4.png", "/product_images/sia-5.png"]'
        WHERE 
            id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567891';
        """))
    await engine.dispose()
    print("Updated local database images successfully.")

if __name__ == "__main__":
    asyncio.run(main())
