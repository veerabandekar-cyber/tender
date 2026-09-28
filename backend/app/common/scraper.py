"""Public tender discovery adapters.

Collects tender metadata from publicly accessible official pages only.
CAPTCHA/anti-bot protections are never bypassed.  If a listing page is
publicly readable, its tender metadata is retained even when a linked
detail page is protected.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from app.common.classifier import classify_instrument

logger = logging.getLogger(__name__)

HEADERS = {
    # A normal browser UA improves compatibility with ordinary public pages.
    # This does not bypass CAPTCHA or authentication.
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/151.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
    "Cache-Control": "no-cache",
}

@dataclass(frozen=True)
class PortalConfig:
    name: str
    url: str
    organization: str
    category: str
    max_pages: int = 3

PORTALS: tuple[PortalConfig, ...] = (
    PortalConfig("CPPP", "https://www.eprocure.gov.in/epublish/app", "Central Public Procurement Portal", "Government", 5),
    PortalConfig("IISc", "https://www.iisc.ac.in/all-tenders/", "Indian Institute of Science", "IISc", 5),
    PortalConfig("IIT Bombay", "https://www.iitb.ac.in/en/tenders", "Indian Institute of Technology Bombay", "IIT", 5),
    PortalConfig("IIT Delhi", "https://home.iitd.ac.in/tenders.php", "Indian Institute of Technology Delhi", "IIT", 5),
    PortalConfig("IIT Hyderabad", "https://www.iith.ac.in/tenders/", "Indian Institute of Technology Hyderabad", "IIT", 5),
    PortalConfig("IIT Kanpur", "https://www.iitk.ac.in/esc/tenders", "Indian Institute of Technology Kanpur", "IIT", 5),
    PortalConfig("IIT Guwahati", "https://www.iitg.ac.in/iitg_tenders_all/", "Indian Institute of Technology Guwahati", "IIT", 5),
    PortalConfig("IIT Jodhpur", "https://iitj.ac.in/Tenders", "Indian Institute of Technology Jodhpur", "IIT", 5),
    PortalConfig("IIT Mandi", "https://iitmandi.ac.in/tenders", "Indian Institute of Technology Mandi", "IIT", 5),
    PortalConfig("IIT BHU", "https://www.iitbhu.ac.in/tenders", "Indian Institute of Technology (BHU) Varanasi", "IIT", 5),
    PortalConfig("IIT Madras", "https://icandsr.iitm.ac.in/tenders/", "Indian Institute of Technology Madras", "IIT", 5),
    PortalConfig("IIT Gandhinagar", "https://iitgn.ac.in/tenders", "Indian Institute of Technology Gandhinagar", "IIT", 5),
    PortalConfig("IIT Bhubaneswar", "https://www.iitbbs.ac.in/tenders/", "Indian Institute of Technology Bhubaneswar", "IIT", 5),
    PortalConfig("IIT Roorkee", "https://www.iitr.ac.in/Main/Tenders", "Indian Institute of Technology Roorkee", "IIT", 5),
    PortalConfig("IISER Pune", "https://www.iiserpune.ac.in/education/tenders", "Indian Institute of Science Education and Research Pune", "IISER", 5),
    PortalConfig("ISRO", "https://www.isro.gov.in/Tenders.html", "Indian Space Research Organisation", "Government", 3),
    PortalConfig("BARC", "https://www.barc.gov.in/tenders/", "Bhabha Atomic Research Centre", "DAE", 3),
    PortalConfig("CSIR", "https://www.csir.res.in/tenders", "Council of Scientific and Industrial Research", "Government", 3),
    PortalConfig("TIFR", "https://www.tifr.res.in/~tenders/", "Tata Institute of Fundamental Research", "Research", 3),
    PortalConfig("NCRA-TIFR", "https://www.ncra.tifr.res.in/ncra/tenders", "National Centre for Radio Astrophysics", "Research", 3),
)

GENERIC_TITLE_TEXT = {
    "tender", "tenders", "notice", "notices", "view", "details", "download",
    "click here", "more", "open", "pdf", "document", "procurement",
    "read more", "view tender", "view details",
}

TENDER_TERMS = (
    "tender", "nit", "bid", "procurement", "eoi", "enquiry", "quotation",
    "purchase", "supply", "rfq", "notice inviting", "gem/", "tender no",
    "spectrometer", "spectrophotometer", "mass spectrometer", "lcms", "gcms",
    "ftir", "raman", "xrf", "xrd", "chromatograph", "chromatography",
)

class TenderHTMLParser(HTMLParser):
    """Dependency-free parser for tables, links, headings and metadata."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[dict[str, str]]] = []
        self.links: list[dict[str, str]] = []
        self.meta: list[dict[str, str]] = []
        self.headings: list[str] = []
        self._row: list[dict[str, str]] | None = None
        self._cell: dict[str, str] | None = None
        self._link: dict[str, str] | None = None
        self._heading: list[str] | None = None
        self._heading_tag: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = {"text": "", "href": ""}
        elif tag == "a":
            self._link = {"text": "", "href": attrs_dict.get("href", "")}
        elif tag in ("h1", "h2", "h3", "h4"):
            self._heading = []
            self._heading_tag = tag
        elif tag == "meta":
            key = attrs_dict.get("name") or attrs_dict.get("property") or attrs_dict.get("itemprop")
            value = attrs_dict.get("content")
            if key and value:
                self.meta.append({"name": key.lower(), "content": normalize_text(value)})

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell["text"] += data + " "
        if self._link is not None:
            self._link["text"] += data + " "
        if self._heading is not None:
            self._heading.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            if self._link and self._link.get("href"):
                self._cell["href"] = self._link["href"]
            self._cell["text"] = normalize_text(self._cell["text"])
            self._row.append(self._cell)
            self._cell = None
        elif tag == "tr":
            if self._row and any(c.get("text") for c in self._row):
                self.rows.append(self._row)
            self._row = None
        elif tag == "a" and self._link is not None:
            link = {"text": normalize_text(self._link["text"]), "href": self._link["href"]}
            if link["href"]:
                self.links.append(link)
            self._link = None
        elif tag in ("h1", "h2", "h3", "h4") and self._heading is not None:
            value = normalize_text(" ".join(self._heading))
            if value:
                self.headings.append(value)
            self._heading = None
            self._heading_tag = None

def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()

def absolute_url(base: str, href: str) -> str:
    return urljoin(base, href.strip())

def same_domain(a: str, b: str) -> bool:
    return urlparse(a).netloc.lower().lstrip("www.") == urlparse(b).netloc.lower().lstrip("www.")

def find_date(text: str) -> str | None:
    patterns = [
        r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b",
        r"\b(\d{1,2}[ -](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ -]\d{2,4})\b",
        r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ -]\d{1,2},?[ -]\d{2,4})\b",
        r"\b(\d{1,2}[ -](?:January|February|March|April|May|June|July|August|September|October|November|December)[ -]\d{2,4})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(1)
    return None

def parse_date_value(value: str | None) -> datetime | None:
    if not value:
        return None
    value = normalize_text(value)
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y",
        "%d %b %Y", "%d %B %Y", "%d-%b-%Y", "%d-%B-%Y",
        "%d %b, %Y", "%b %d, %Y", "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None

def find_reference(text: str) -> str | None:
    patterns = [
        r"(?:tender\s+)?(?:reference|ref(?:erence)?|tender|bid|nit|enquiry|notice)\s*(?:no\.?|number|id|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9./_-]{3,})",
        r"\b(GEM/[A-Z0-9/.-]+)\b",
        r"\b(20\d{2}_[A-Z0-9]+_\d+_\d+)\b",
        r"\b([A-Z]{2,}(?:/[A-Z0-9.-]+){2,})\b",
    ]
    invalid_extensions = (".pdf", ".html", ".htm", ".php", ".docx", ".doc", ".xlsx", ".zip", ".jpg", ".png")
    invalid_prefixes = ("doc", "file", "download", "attachment", "click", "view", "pdf", "notice", "tender_doc", "corrigendum")
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            value = normalize_text(match.group(1)).strip(".,;:) /")
            val_lower = value.lower()
            if any(val_lower.endswith(ext) for ext in invalid_extensions):
                continue
            if any(val_lower == p or val_lower.startswith(p + ".") or val_lower.startswith(p + "_") for p in invalid_prefixes):
                continue
            if len(value) >= 4 and not re.fullmatch(r"[\d\W]+", value):
                return value
    return None

def generate_tender_reference(reference: str | None, portal_name: str, stable_key: str) -> str:
    if reference:
        return reference
    clean_portal = re.sub(r'[^A-Z0-9]', '', portal_name.upper())[:6] or "TND"
    hash_id = hashlib.sha256(stable_key.encode("utf-8")).hexdigest()[:8].upper()
    return f"{clean_portal}-PUB-{hash_id}"

def find_value(text: str) -> float | None:
    # Never infer a tender value from EMD/security/deposit amounts.
    match = re.search(
        r"(?:tender value|estimated cost|estimated value|bid value|total value|approx\.?\s*cost)"
        r"\s*[:\-]?\s*(?:INR|Rs\.?|₹)?\s*([0-9][0-9,]*(?:\.\d+)?)",
        text, re.I,
    )
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None

def is_tenderish(text: str, href: str = "") -> bool:
    sample = f"{text} {href}".lower()
    return any(term in sample for term in TENDER_TERMS)

def _useful_title(text: str) -> bool:
    value = normalize_text(text)
    if len(value) < 8 or re.fullmatch(r"[\d\W]+", value):
        return False
    return value.lower().strip(" .:-") not in GENERIC_TITLE_TEXT

def choose_title(
    cells: list[str],
    fallback: str,
    linked_cells: list[str] | None = None,
    headings: list[str] | None = None,
    meta_title: str | None = None,
) -> str:
    # Prefer actual linked tender text, then headings/meta, then descriptive cells.
    linked = [normalize_text(c) for c in (linked_cells or []) if _useful_title(c)]
    if linked:
        linked.sort(key=lambda x: (is_tenderish(x), len(x)), reverse=True)
        return linked[0][:1000]

    heading_candidates = [h for h in (headings or []) if _useful_title(h)]
    if heading_candidates:
        heading_candidates.sort(key=lambda x: (is_tenderish(x), len(x)), reverse=True)
        return heading_candidates[0][:1000]

    if meta_title and _useful_title(meta_title):
        return meta_title[:1000]

    candidates = [normalize_text(c) for c in cells if _useful_title(c)]
    candidates.sort(key=lambda x: (is_tenderish(x), len(x)), reverse=True)
    return candidates[0][:1000] if candidates else fallback[:1000]

def _extract_jsonld(html: str, portal: PortalConfig, page_url: str) -> list[dict[str, Any]]:
    """Extract Schema.org/JSON-LD records when a site exposes them."""
    results: list[dict[str, Any]] = []
    for match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.I | re.S,
    ):
        raw = match.group(1).strip()
        try:
            data = json.loads(raw)
        except Exception:
            continue

        objects: list[Any] = []
        if isinstance(data, list):
            objects = data
        elif isinstance(data, dict):
            objects = data.get("@graph") if isinstance(data.get("@graph"), list) else [data]

        for obj in objects:
            if not isinstance(obj, dict):
                continue
            typ = str(obj.get("@type", "")).lower()
            if typ not in {"tender", "offer", "demand", "itemlist"} and not any(
                is_tenderish(str(obj.get(k, ""))) for k in ("name", "description", "url")
            ):
                continue

            title = normalize_text(str(obj.get("name") or obj.get("headline") or ""))
            description = normalize_text(str(obj.get("description") or ""))
            source_url = absolute_url(page_url, str(obj.get("url") or page_url))
            combined = f"{title} {description}"
            if not (title and is_tenderish(combined, source_url)):
                continue

            reference = find_reference(
                f"{obj.get('identifier', '')} {obj.get('sku', '')} {description}"
            )
            closing = find_date(
                f"{obj.get('validThrough', '')} {obj.get('endDate', '')} {description}"
            )
            value = find_value(combined)
            stable_key = reference or source_url or combined
            tender_number = generate_tender_reference(reference, portal.name, stable_key)
            category = classify_instrument(title, description)

            results.append({
                "tender_number": tender_number,
                "title": title[:1000],
                "portal": portal.name,
                "instrument_category": category,
                "document_url": source_url if source_url.lower().endswith(".pdf") else None,
                "source_url": source_url,
                "bid_closing_date": parse_date_value(closing),
                "organization_name": portal.organization,
                "department": portal.category,
                "tender_value": value,
                "raw_source": {
                    "page_url": page_url,
                    "jsonld": obj,
                    "reference_published": bool(reference),
                    "access_status": "public_listing",
                },
            })
    return results

def _make_link_item(link: dict[str, str], portal: PortalConfig, page_url: str) -> dict[str, Any] | None:
    text = normalize_text(link.get("text", ""))
    href = absolute_url(page_url, link.get("href", ""))
    if not _useful_title(text) or not is_tenderish(text, href):
        return None

    reference = find_reference(text)
    closing = find_date(text)
    stable_key = reference or href or text
    tender_number = generate_tender_reference(reference, portal.name, stable_key)
    category = classify_instrument(text, text)

    return {
        "tender_number": tender_number,
        "title": text[:1000],
        "portal": portal.name,
        "instrument_category": category,
        "document_url": href if href.lower().split("?")[0].endswith(".pdf") else None,
        "source_url": href,
        "bid_closing_date": parse_date_value(closing),
        "organization_name": portal.organization,
        "department": portal.category,
        "tender_value": find_value(text),
        "raw_source": {
            "page_url": page_url,
            "cells": [text],
            "links": [href],
            "reference_published": bool(reference),
            "access_status": "public_listing",
        },
    }

def row_to_item(
    row: list[dict[str, str]],
    portal: PortalConfig,
    page_url: str,
    headings: list[str] | None = None,
    meta_title: str | None = None,
) -> dict[str, Any] | None:
    cells = [normalize_text(c["text"]) for c in row if c.get("text")]
    hrefs = [absolute_url(page_url, c["href"]) for c in row if c.get("href")]
    combined = " | ".join(cells)

    if not is_tenderish(combined, " ".join(hrefs)):
        return None

    source_url = next((h for h in hrefs if is_tenderish(h)), hrefs[0] if hrefs else page_url)
    linked_cells = [c["text"] for c in row if c.get("href") and c.get("text")]
    title = choose_title(cells, portal.name + " tender opportunity", linked_cells, headings, meta_title)
    reference = find_reference(combined)
    closing = find_date(combined)
    value = find_value(combined)

    # Keep the full row as description/raw source so later keyword search can
    # match terms such as "spectrometer" even when they are not in the title.
    description = combined[:5000]
    stable_key = reference or source_url or combined
    tender_number = generate_tender_reference(reference, portal.name, stable_key)
    category = classify_instrument(title, description)

    return {
        "tender_number": tender_number,
        "title": title,
        "portal": portal.name,
        "instrument_category": category,
        "document_url": next((h for h in hrefs if h.lower().split("?")[0].endswith(".pdf")), None),
        "source_url": source_url,
        "bid_closing_date": parse_date_value(closing),
        "organization_name": portal.organization,
        "department": portal.category,
        "tender_value": value,
        "raw_source": {
            "page_url": page_url,
            "cells": cells,
            "links": hrefs,
            "description": description,
            "reference_published": bool(reference),
            "access_status": "public_listing",
        },
    }

def _has_public_tender_content(parser: TenderHTMLParser) -> bool:
    """A CAPTCHA word alone must never discard a usable tender listing."""
    useful_rows = sum(
        1 for row in parser.rows
        if is_tenderish(" | ".join(c.get("text", "") for c in row))
    )
    useful_links = sum(
        1 for link in parser.links
        if is_tenderish(link.get("text", ""), link.get("href", ""))
    )
    return useful_rows > 0 or useful_links > 0

def looks_like_block_page(text: str, parser: TenderHTMLParser | None = None) -> bool:
    sample = text.lower()
    strong_markers = (
        "verify you are human",
        "i'm not a robot",
        "checking your browser",
        "security verification",
        "access denied",
        "enable javascript and cookies",
        "attention required! | cloudflare",
    )
    captcha_markers = ("captcha", "recaptcha")
    if parser is not None and _has_public_tender_content(parser):
        return False
    if any(marker in sample for marker in strong_markers):
        return True
    # Only treat a CAPTCHA-only page as blocked when it has no public tender content.
    if any(marker in sample for marker in captcha_markers):
        visible_text = re.sub(r"<[^>]+>", " ", text)
        visible_text = normalize_text(visible_text)
        return len(visible_text) < 2500
    return False

async def fetch_page(
    client: httpx.AsyncClient,
    url: str,
) -> tuple[str | None, str | None, int | None]:
    try:
        response = await client.get(
            url,
            headers=HEADERS,
            timeout=httpx.Timeout(20.0, connect=10.0),
            follow_redirects=True,
        )
        if response.status_code in (401, 403, 429):
            return None, f"HTTP {response.status_code}", response.status_code
        if response.status_code >= 400:
            return None, f"HTTP {response.status_code}", response.status_code
        return response.text, None, response.status_code
    except Exception as exc:
        return None, str(exc), None

def links_to_pages(
    parser: TenderHTMLParser,
    base_url: str,
    current_url: str,
    max_pages: int,
) -> list[str]:
    pages: list[str] = []
    for link in parser.links:
        href = absolute_url(current_url, link["href"])
        if not same_domain(base_url, href):
            continue
        blob = f"{link['text']} {href}".lower()
        if any(term in blob for term in (
            "next", "page=", "page/", "pagination", "older", "load more", "archive", "previous"
        )):
            if href not in pages and href not in {current_url, base_url}:
                pages.append(href)
        if len(pages) >= max_pages - 1:
            break
    return pages

async def scrape_portal_config(portal: PortalConfig) -> tuple[list[dict[str, Any]], list[str]]:
    results: list[dict[str, Any]] = []
    logs: list[str] = []
    visited: set[str] = set()
    queue: list[str] = [portal.url]

    async with httpx.AsyncClient(
        verify=True,
        follow_redirects=True,
        headers=HEADERS,
    ) as client:
        while queue and len(visited) < portal.max_pages:
            url = queue.pop(0)
            if url in visited:
                continue
            visited.add(url)

            html, error, status_code = await fetch_page(client, url)
            if error:
                reason = "CAPTCHA/access protection" if status_code in (401, 403, 429) else error
                logs.append(
                    f"{portal.name}: listing not machine-readable ({reason}); "
                    f"no bypass attempted. Official portal retained for manual access."
                )
                continue
            if not html:
                continue

            parser = TenderHTMLParser()
            try:
                parser.feed(html)
            except Exception as exc:
                logs.append(f"{portal.name}: HTML parsing failed on {url}: {exc}")
                continue

            if looks_like_block_page(html[:100000], parser):
                logs.append(
                    f"{portal.name}: CAPTCHA/access-protection page detected; "
                    f"no bypass attempted. Public metadata from this page was not discarded if present."
                )
                continue

            before = len(results)

            # 1) Standard HTML table rows.
            for row in parser.rows:
                item = row_to_item(
                    row, portal, url,
                    headings=parser.headings,
                    meta_title=next(
                        (m["content"] for m in parser.meta if m["name"] in ("og:title", "title", "twitter:title")),
                        None,
                    ),
                )
                if item:
                    results.append(item)

            # 2) Tender-like links outside tables.
            for link in parser.links:
                item = _make_link_item(link, portal, url)
                if item:
                    results.append(item)

            # 3) Schema.org / JSON-LD, common on modern institutional sites.
            results.extend(_extract_jsonld(html, portal, url))

            # Only follow pagination links from the same official domain.
            queue.extend(links_to_pages(parser, portal.url, url, portal.max_pages))

            logs.append(
                f"{portal.name}: scanned {url} and found {len(results) - before} "
                f"public tender candidates."
            )

    unique: dict[str, dict[str, Any]] = {}
    for item in results:
        key = (
            item["tender_number"]
            if not ("-PUB-" in item["tender_number"] or item["tender_number"].startswith("NOT-PUBLISHED/"))
            else (item.get("source_url") or item["tender_number"])
        )
        unique[key] = item
    return list(unique.values()), logs

async def scrape_all_portals() -> tuple[list[dict[str, Any]], list[str]]:
    """Run configured public portal adapters concurrently, isolating failures."""
    tasks = [scrape_portal_config(portal) for portal in PORTALS]
    outputs = await asyncio.gather(*tasks, return_exceptions=True)

    all_items: list[dict[str, Any]] = []
    logs: list[str] = []

    for portal, output in zip(PORTALS, outputs):
        if isinstance(output, Exception):
            logger.exception("%s scraper failed", portal.name, exc_info=output)
            logs.append(f"{portal.name}: scraper error isolated from other portals: {output}")
            continue
        items, portal_logs = output
        all_items.extend(items)
        logs.extend(portal_logs)

    unique: dict[str, dict[str, Any]] = {}
    for item in all_items:
        key = (
            item["tender_number"]
            if not ("-PUB-" in item["tender_number"] or item["tender_number"].startswith("NOT-PUBLISHED/"))
            else (item.get("source_url") or item["tender_number"])
        )
        unique[key] = item

    return list(unique.values()), logs

async def scrape_portal(portal: str, keywords: list[str] | None = None) -> list[dict[str, Any]]:
    """Compatibility wrapper used by older callers. Keywords are intentionally ignored."""
    config = next((p for p in PORTALS if p.name.lower() == portal.lower()), None)
    if not config:
        return []
    results, _ = await scrape_portal_config(config)
    return results
