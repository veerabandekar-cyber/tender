"""Optional AI enrichment for tender records.

AI is strictly enrichment-only. It is never allowed to invent tender values,
dates, references, organisations, or competitor information when the source does
not contain them. Discovery itself does not depend on this module.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

import google.generativeai as genai
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
api_key = settings.gemini_api_key

if api_key and api_key != "mock-api-key-for-now":
    try:
        genai.configure(api_key=api_key)
    except Exception:
        logger.exception("Failed to configure Gemini")
        api_key = None
else:
    api_key = None


def parse_iso_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d")
    except ValueError:
        return None


async def extract_tender_details(
    text_content: str,
    tender_number_fallback: str | None = None,
    document_url: str | None = None,
    source_url: str | None = None,
    title_fallback: str | None = None,
) -> dict[str, Any]:
    """Return source-grounded fields, optionally enriched by Gemini."""
    base: dict[str, Any] = {
        "tender_number": tender_number_fallback,
        "title": title_fallback or "Tender opportunity",
        "department": None,
        "instrument_category": None,
        "portal": None,
        "tender_value": None,
        "bid_start_date": None,
        "bid_closing_date": None,
        "contact_person": None,
        "contact_email": None,
        "contact_phone": None,
        "eligible_oems": [],
        "existing_oem": None,
        "likely_competitors": [],
        "action_required": None,
        "source_url": source_url,
        "document_url": document_url,
        "raw_extracted_data": {"source_text_available": bool(text_content.strip())},
    }

    if not api_key or len(text_content.strip()) < 10:
        return base

    prompt = f"""Extract only facts explicitly present in this tender document. Never infer or estimate missing values.\nReturn JSON only. Use null when a field is not explicitly present.\nFields: tender_number, title, department, instrument_category, tender_value, bid_start_date, bid_closing_date, contact_person, contact_email, contact_phone, eligible_oems, existing_oem, action_required.\nKnown source title: {title_fallback or ''}\nKnown source reference: {tender_number_fallback or ''}\nDOCUMENT:\n{text_content[:20000]}"""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = await model.generate_content_async(prompt, generation_config={"response_mime_type": "application/json"})
        parsed = json.loads(response.text.strip())
        for key in ("department", "instrument_category", "contact_person", "contact_email", "contact_phone", "existing_oem", "action_required"):
            if parsed.get(key) is not None:
                base[key] = parsed[key]
        for key in ("eligible_oems",):
            if isinstance(parsed.get(key), list):
                base[key] = parsed[key]
        if parsed.get("tender_number"):
            base["tender_number"] = parsed["tender_number"]
        if parsed.get("title"):
            base["title"] = parsed["title"]
        if parsed.get("tender_value") is not None:
            try:
                base["tender_value"] = float(parsed["tender_value"])
            except (TypeError, ValueError):
                base["tender_value"] = None
        base["bid_start_date"] = parse_iso_date(parsed.get("bid_start_date"))
        base["bid_closing_date"] = parse_iso_date(parsed.get("bid_closing_date"))
        base["raw_extracted_data"] = parsed
    except Exception as exc:
        logger.warning("AI enrichment unavailable; preserving deterministic source fields: %s", exc)
    return base
