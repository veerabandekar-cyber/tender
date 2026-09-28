import pytest
from datetime import datetime
from unittest.mock import patch
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_search_keywords_crud(client: AsyncClient, admin_auth_headers):
    # 1. Create a keyword config
    payload = {"keyword": "laser spectrometer", "is_active": True}
    res_create = await client.post("/api/v1/discovery/keywords", json=payload, headers=admin_auth_headers)
    assert res_create.status_code == 201
    kw_id = res_create.json()["id"]
    assert res_create.json()["keyword"] == "laser spectrometer"
    assert res_create.json()["is_active"] is True

    # 2. Get keywords list
    res_list = await client.get("/api/v1/discovery/keywords", headers=admin_auth_headers)
    assert res_list.status_code == 200
    kw_list = res_list.json()
    assert len(kw_list) >= 1
    assert any(k["keyword"] == "laser spectrometer" for k in kw_list)

    # 3. Patch keyword (toggle is_active to False)
    patch_payload = {"is_active": False}
    res_patch = await client.patch(f"/api/v1/discovery/keywords/{kw_id}", json=patch_payload, headers=admin_auth_headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["is_active"] is False

    # 4. Delete keyword config
    res_delete = await client.delete(f"/api/v1/discovery/keywords/{kw_id}", headers=admin_auth_headers)
    assert res_delete.status_code == 204

    # Verify deleted
    res_list_final = await client.get("/api/v1/discovery/keywords", headers=admin_auth_headers)
    assert not any(k["id"] == kw_id for k in res_list_final.json())

@pytest.mark.asyncio
async def test_discovery_run_pipeline(client: AsyncClient, admin_auth_headers, db_session):
    # First, let's seed an active keyword to search for
    keyword_payload = {"keyword": "high vacuum detector", "is_active": True}
    await client.post("/api/v1/discovery/keywords", json=keyword_payload, headers=admin_auth_headers)

    mock_scraped_items = [
        {
            "tender_number": "IISc-TEST-2026-999",
            "title": "Supply and Installation of High Vacuum Detector",
            "organization_name": "Indian Institute of Science",
            "department": "Physics & Nanotechnology",
            "portal": "IISc",
            "tender_value": 2500000.0,
            "bid_closing_date": datetime.now(),
            "source_url": "https://www.iisc.ac.in/all-tenders/",
            "document_url": "https://www.iisc.ac.in/tender-doc.pdf",
            "raw_source": {"description": "Supply of high vacuum detector for laboratory"},
        }
    ]
    mock_logs = ["Portal IISc: 1 public tender found."]

    with patch("app.modules.discovery.service.scrape_all_portals", return_value=(mock_scraped_items, mock_logs)):
        # Run the discovery pipeline manually via endpoint
        res_run = await client.post("/api/v1/discovery/run?sync=true", headers=admin_auth_headers)
        assert res_run.status_code == 200
        run_data = res_run.json()

        # Audit log validation
        assert run_data["status"] == "Completed"
        assert run_data["tenders_found"] > 0
        assert "crawling" in run_data["logs"].lower() or "starting" in run_data["logs"].lower() or "collecting" in run_data["logs"].lower()

        # Verify that new mock tenders were inserted in database
        res_tenders = await client.get("/api/v1/tenders/", headers=admin_auth_headers)
        assert res_tenders.status_code == 200
        assert res_tenders.json()["total"] > 0

        # Verify that search execution logs can be retrieved
        res_logs = await client.get("/api/v1/discovery/logs", headers=admin_auth_headers)
        assert res_logs.status_code == 200
        assert len(res_logs.json()) >= 1
        assert res_logs.json()[0]["id"] == run_data["id"]
