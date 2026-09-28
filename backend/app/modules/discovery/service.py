import logging
from datetime import datetime
from uuid import UUID
from typing import Sequence
from fastapi import HTTPException, status
from app.modules.discovery.models import SearchKeyword, SearchLog
from app.modules.discovery.repository import DiscoveryRepository
from app.modules.discovery.schemas import SearchKeywordCreate, SearchKeywordUpdate
from app.modules.tenders.repository import TenderRepository
from app.modules.organizations.repository import OrganizationRepository
from app.common.scraper import scrape_all_portals

logger = logging.getLogger(__name__)


class DiscoveryService:
    """Coordinates public tender discovery and stores source-grounded records."""
    def __init__(self, repository: DiscoveryRepository, tender_repo: TenderRepository, org_repo: OrganizationRepository):
        self.repository = repository
        self.tender_repo = tender_repo
        self.org_repo = org_repo

    async def get_all_keywords(self) -> Sequence[SearchKeyword]:
        return await self.repository.get_all_keywords()

    async def get_active_keywords(self) -> Sequence[SearchKeyword]:
        return await self.repository.get_active_keywords()

    async def create_keyword(self, kw_in: SearchKeywordCreate) -> SearchKeyword:
        existing = await self.repository.get_keyword_by_text(kw_in.keyword)
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Keyword '{kw_in.keyword}' already exists.")
        return await self.repository.create_keyword(kw_in.model_dump())

    async def update_keyword(self, kw_id: UUID, kw_in: SearchKeywordUpdate) -> SearchKeyword | None:
        if kw_in.keyword:
            existing = await self.repository.get_keyword_by_text(kw_in.keyword)
            if existing and existing.id != kw_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Keyword '{kw_in.keyword}' already exists.")
        return await self.repository.update_keyword(kw_id, kw_in.model_dump(exclude_unset=True))

    async def delete_keyword(self, kw_id: UUID) -> bool:
        return await self.repository.delete_keyword(kw_id)

    async def get_search_logs(self, limit: int = 100, offset: int = 0) -> Sequence[SearchLog]:
        return await self.repository.get_all_logs(limit, offset)

    async def create_initial_log(self) -> SearchLog:
        log = await self.repository.create_log({
            "started_at": datetime.now(),
            "status": "Running",
            "tenders_found": 0,
            "logs": "Starting public tender discovery...\n"
        })
        await self.repository.session.commit()
        return log

    async def execute_discovery_pipeline(self, search_log_id: UUID) -> SearchLog:
        log_messages: list[str] = ["Starting public tender discovery...\n"]

        def log(msg: str) -> None:
            line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
            logger.info(line)
            log_messages.append(line)

        try:
            log("Collecting publicly accessible tender listings. Keyword filters are applied only after ingestion.")
            items, portal_logs = await scrape_all_portals()
            log(f"Public discovery returned {len(items)} tender candidates across configured portals.")
            for line in portal_logs:
                log(line)

            created = 0
            updated = 0
            for item in items:
                tender_number = item["tender_number"]
                existing = await self.tender_repo.get_by_tender_number(tender_number)
                if existing:
                    # Refresh source metadata without overwriting user-managed sales fields.
                    updates = {k: item[k] for k in ("title", "portal", "department", "instrument_category", "source_url", "document_url", "bid_closing_date", "tender_value") if k in item and item[k] is not None}
                    if updates:
                        await self.tender_repo.update(existing.id, updates)
                        updated += 1
                    continue

                org_name = item.get("organization_name")
                org_id = None
                if org_name:
                    org = await self.org_repo.get_by_name(org_name)
                    if not org:
                        org = await self.org_repo.create({
                            "name": org_name,
                            "type": "University" if "IIT" in org_name or "IIS" in org_name else "Government/Research",
                            "category": item.get("department") or "Other",
                            "website": item.get("source_url"),
                            "notes": "Created from a public tender listing during discovery."
                        })
                    org_id = org.id

                # Store only source-grounded fields. AI/PDF enrichment is optional and never used to invent missing fields.
                data = {
                    "tender_number": tender_number,
                    "title": item["title"],
                    "organization_id": org_id,
                    "department": item.get("department"),
                    "instrument_category": item.get("instrument_category"),
                    "portal": item.get("portal"),
                    "tender_value": item.get("tender_value"),
                    "bid_closing_date": item.get("bid_closing_date"),
                    "source_url": item.get("source_url"),
                    "document_url": item.get("document_url"),
                    "eligible_oems": [],
                    "likely_competitors": [],
                    "raw_extracted_data": item.get("raw_source", {}),
                }
                await self.tender_repo.create(data)
                created += 1

            log(f"Stored {created} new tender(s); refreshed {updated} existing source record(s).")
            log("Keyword search remains available from the Tender Tracker and is not used to suppress discovery.")
            status_value = "Completed"
            found = created
        except Exception as exc:
            logger.exception("Discovery pipeline failed")
            log(f"Discovery failed: {exc}")
            status_value = "Failed"
            found = 0

        await self.repository.update_log(search_log_id, {
            "status": status_value,
            "completed_at": datetime.now(),
            "tenders_found": found,
            "logs": "\n".join(log_messages),
        })
        await self.repository.session.commit()
        return await self.repository.get_log_by_id(search_log_id)

    async def run_discovery_pipeline(self) -> SearchLog:
        search_log = await self.create_initial_log()
        return await self.execute_discovery_pipeline(search_log.id)
