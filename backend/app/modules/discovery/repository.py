from uuid import UUID
from typing import Sequence
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.discovery.models import SearchKeyword, SearchLog

class DiscoveryRepository:
    """Repository for managing database actions on Search Keywords and Scraper Search Logs."""
    def __init__(self, session: AsyncSession):
        self.session = session

    # SearchKeyword actions
    async def create_keyword(self, data: dict) -> SearchKeyword:
        kw = SearchKeyword(**data)
        self.session.add(kw)
        await self.session.flush()
        await self.session.refresh(kw)
        return kw

    async def get_keyword_by_id(self, keyword_id: UUID) -> SearchKeyword | None:
        result = await self.session.execute(
            select(SearchKeyword).where(SearchKeyword.id == keyword_id)
        )
        return result.scalar_one_or_none()

    async def get_keyword_by_text(self, keyword: str) -> SearchKeyword | None:
        result = await self.session.execute(
            select(SearchKeyword).where(SearchKeyword.keyword == keyword)
        )
        return result.scalar_one_or_none()

    async def get_active_keywords(self) -> Sequence[SearchKeyword]:
        result = await self.session.execute(
            select(SearchKeyword).where(SearchKeyword.is_active == True)
        )
        return result.scalars().all()

    async def get_all_keywords(self) -> Sequence[SearchKeyword]:
        result = await self.session.execute(
            select(SearchKeyword).order_by(SearchKeyword.keyword.asc())
        )
        return result.scalars().all()

    async def update_keyword(self, keyword_id: UUID, data: dict) -> SearchKeyword | None:
        kw = await self.get_keyword_by_id(keyword_id)
        if not kw:
            return None
        for key, value in data.items():
            setattr(kw, key, value)
        await self.session.flush()
        await self.session.refresh(kw)
        return kw

    async def delete_keyword(self, keyword_id: UUID) -> bool:
        kw = await self.get_keyword_by_id(keyword_id)
        if not kw:
            return False
        await self.session.delete(kw)
        await self.session.flush()
        return True

    # SearchLog actions
    async def create_log(self, data: dict) -> SearchLog:
        log = SearchLog(**data)
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def get_log_by_id(self, log_id: UUID) -> SearchLog | None:
        result = await self.session.execute(
            select(SearchLog).where(SearchLog.id == log_id)
        )
        return result.scalar_one_or_none()

    async def get_all_logs(self, limit: int = 100, offset: int = 0) -> Sequence[SearchLog]:
        result = await self.session.execute(
            select(SearchLog)
            .order_by(desc(SearchLog.started_at))
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    async def update_log(self, log_id: UUID, data: dict) -> SearchLog | None:
        log = await self.get_log_by_id(log_id)
        if not log:
            return None
        for key, value in data.items():
            setattr(log, key, value)
        await self.session.flush()
        await self.session.refresh(log)
        return log
