import pytest
from uuid import uuid4
from httpx import AsyncClient
from app.modules.tenders.models import TenderStatus

@pytest.mark.asyncio
async def test_create_tender(client: AsyncClient, admin_auth_headers, seed_organization):
    payload = {
        "tender_number": "GeM/2026/SPECT/1234",
        "title": "Supply of High Resolution Mass Spectrometer",
        "organization_id": str(seed_organization.id),
        "department": "Mass Spectrometry Lab",
        "instrument_category": "Mass Spectrometer",
        "portal": "GeM",
        "tender_value": 7500000.00,
        "eligible_oems": ["Bruker", "Thermo Fisher"],
        "status": "New",
        "action_required": "Prepare technical specification sheet."
    }
    response = await client.post("/api/v1/tenders/", json=payload, headers=admin_auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["tender_number"] == "GeM/2026/SPECT/1234"
    assert data["organization_id"] == str(seed_organization.id)
    assert data["is_active"] is True
    assert data["status"] == "New"

@pytest.mark.asyncio
async def test_duplicate_tender_number(client: AsyncClient, admin_auth_headers, seed_organization):
    # Register first tender
    payload = {
        "tender_number": "GeM/2026/SPECT/5555",
        "title": "Laser system procurement",
        "organization_id": str(seed_organization.id),
        "tender_value": 4500000.00,
        "eligible_oems": ["Coherent"]
    }
    res1 = await client.post("/api/v1/tenders/", json=payload, headers=admin_auth_headers)
    assert res1.status_code == 201

    # Try registering second tender with duplicate tender_number
    payload_dup = {
        "tender_number": "GeM/2026/SPECT/5555", # Duplicate
        "title": "Another laser system",
        "organization_id": str(seed_organization.id),
        "tender_value": 3000000.00,
        "eligible_oems": ["Spectra-Physics"]
    }
    res2 = await client.post("/api/v1/tenders/", json=payload_dup, headers=admin_auth_headers)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()

@pytest.mark.asyncio
async def test_tender_status_update(client: AsyncClient, admin_auth_headers, seed_organization):
    # Create tender
    payload = {
        "tender_number": "GeM/2026/SPECT/8888",
        "title": "Cryogenic vessel supply",
        "organization_id": str(seed_organization.id),
        "eligible_oems": ["CryoCorp"]
    }
    res = await client.post("/api/v1/tenders/", json=payload, headers=admin_auth_headers)
    assert res.status_code == 201
    tender_id = res.json()["id"]

    # Patch status to UNDER_REVIEW
    status_payload = {"status": "Under Review"}
    res_patch = await client.patch(f"/api/v1/tenders/{tender_id}/status", json=status_payload, headers=admin_auth_headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "Under Review"

    # Patch status to WON
    status_payload_won = {"status": "Won"}
    res_patch_won = await client.patch(f"/api/v1/tenders/{tender_id}/status", json=status_payload_won, headers=admin_auth_headers)
    assert res_patch_won.status_code == 200
    assert res_patch_won.json()["status"] == "Won"

@pytest.mark.asyncio
async def test_tender_list_filters_and_soft_delete(client: AsyncClient, admin_auth_headers, seed_organization):
    # Create tender A
    payload_a = {
        "tender_number": "GeM/2026/A",
        "title": "Laser Amplifiers",
        "organization_id": str(seed_organization.id),
        "status": "New"
    }
    await client.post("/api/v1/tenders/", json=payload_a, headers=admin_auth_headers)

    # Create tender B
    payload_b = {
        "tender_number": "GeM/2026/B",
        "title": "Spectrometer Vacuum Pump",
        "organization_id": str(seed_organization.id),
        "status": "Interested"
    }
    res_b = await client.post("/api/v1/tenders/", json=payload_b, headers=admin_auth_headers)
    tender_b_id = res_b.json()["id"]

    # 1. Test List & Search
    res_list = await client.get("/api/v1/tenders/?search=Laser", headers=admin_auth_headers)
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert data_list["total"] == 1
    assert data_list["items"][0]["tender_number"] == "GeM/2026/A"

    # 2. Test List & Status Filter
    res_list_status = await client.get("/api/v1/tenders/?status=Interested", headers=admin_auth_headers)
    assert res_list_status.status_code == 200
    assert res_list_status.json()["total"] == 1
    assert res_list_status.json()["items"][0]["tender_number"] == "GeM/2026/B"

    # 3. Soft Delete Tender B
    res_delete = await client.delete(f"/api/v1/tenders/{tender_b_id}", headers=admin_auth_headers)
    assert res_delete.status_code == 204

    # Verify Tender B is no longer in active listings
    res_list_final = await client.get("/api/v1/tenders/", headers=admin_auth_headers)
    assert res_list_final.status_code == 200
    # Tender B is deleted, so only Tender A remains
    assert res_list_final.json()["total"] == 1
    assert res_list_final.json()["items"][0]["tender_number"] == "GeM/2026/A"
