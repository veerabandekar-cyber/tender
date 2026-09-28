import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_valid_domains(client: AsyncClient):
    # Test valid domain: @analytica.com
    payload_1 = {
        "email": "testuser1@analytica.com",
        "first_name": "Test",
        "last_name": "One",
        "password": "securepassword123",
        "role": "Sales Team"
    }
    response_1 = await client.post("/api/v1/auth/register", json=payload_1)
    assert response_1.status_code == 201
    data_1 = response_1.json()
    assert "access_token" in data_1
    assert data_1["user"]["email"] == "testuser1@analytica.com"
    assert data_1["user"]["is_active"] is True

    # Test valid domain: @analyticasofttech.com
    payload_2 = {
        "email": "testuser2@analyticasofttech.com",
        "first_name": "Test",
        "last_name": "Two",
        "password": "securepassword123",
        "role": "Sales Team"
    }
    response_2 = await client.post("/api/v1/auth/register", json=payload_2)
    assert response_2.status_code == 201
    assert response_2.json()["user"]["email"] == "testuser2@analyticasofttech.com"

@pytest.mark.asyncio
async def test_register_invalid_domain(client: AsyncClient):
    # Test invalid domain: @gmail.com
    payload = {
        "email": "invaliduser@gmail.com",
        "first_name": "Invalid",
        "last_name": "User",
        "password": "securepassword123",
        "role": "Sales Team"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "domain" in response.json()["detail"].lower()

@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    # Test short password: < 6 characters
    payload = {
        "email": "invaliduser@analytica.com",
        "first_name": "Invalid",
        "last_name": "User",
        "password": "123", # Too short
        "role": "Sales Team"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422 # Pydantic validation error

@pytest.mark.asyncio
async def test_login_flow(client: AsyncClient, seed_admin):
    # Valid credentials with portal domain @analyticasofttech.com
    payload = {
        "email": seed_admin.email,
        "password": "adminpass"
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == seed_admin.email

    # Invalid domain login attempt (rejected with 400)
    payload_bad_domain = {
        "email": "user@gmail.com",
        "password": "somepassword"
    }
    response_bad_domain = await client.post("/api/v1/auth/login", json=payload_bad_domain)
    assert response_bad_domain.status_code == 400
    assert "analyticasofttech.com" in response_bad_domain.json()["detail"].lower()

@pytest.mark.asyncio
async def test_auth_me_endpoint(client: AsyncClient, seed_admin, admin_auth_headers):
    # Authenticated access
    response = await client.get("/api/v1/auth/me", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == seed_admin.email
    assert data["id"] == str(seed_admin.id)

    # Unauthenticated access
    response_unauth = await client.get("/api/v1/auth/me")
    assert response_unauth.status_code == 401
