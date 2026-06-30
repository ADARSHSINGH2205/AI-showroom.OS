from jose import jwt

from app.core.config import get_settings
from app.core.rate_limit import LoginRateLimiter
from app.core.security import ALGORITHM


def login_token(client) -> str:
    settings = get_settings()
    response = client.post(
        "/api/v1/auth/login",
        json={"username": settings.seed_owner_username, "password": settings.seed_owner_password},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_security_headers_and_health_minimization(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.headers["content-security-policy"].startswith("default-src 'none'")
    assert response.headers["x-request-id"]


def test_untrusted_host_is_rejected(client):
    response = client.get("/health", headers={"Host": "attacker.example"})
    assert response.status_code == 400


def test_protected_endpoint_requires_authentication(client):
    response = client.get("/api/v1/products")
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_jwt_without_required_audience_is_rejected(client):
    settings = get_settings()
    token = jwt.encode({"sub": "1"}, settings.secret_key, algorithm=ALGORITHM)
    response = client.get("/api/v1/products", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_login_rejects_unknown_fields(client):
    settings = get_settings()
    response = client.post(
        "/api/v1/auth/login",
        json={
            "username": settings.seed_owner_username,
            "password": settings.seed_owner_password,
            "unexpected": "value",
        },
    )
    assert response.status_code == 422


def test_bill_upload_rejects_spoofed_image_content(client):
    token = login_token(client)
    response = client.post(
        "/api/v1/ai/bill-detect?bill_type=buying",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("bill.jpg", b"this is not a jpeg", "image/jpeg")},
    )
    assert response.status_code == 400
    assert "does not match" in response.json()["detail"]


def test_negative_money_is_rejected_before_service_execution(client):
    token = login_token(client)
    response = client.post(
        "/api/v1/sales",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "bill_date": "2026-06-30",
            "customer_name": "Invalid",
            "tax": "-1",
            "items": [{"product_id": 1, "quantity": 1, "unit_selling_price": "100"}],
        },
    )
    assert response.status_code == 422


def test_login_rate_limiter_locks_and_resets_keys():
    limiter = LoginRateLimiter(max_attempts=3, window_seconds=60, lockout_seconds=60)
    keys = ["ip:127.0.0.1", "account:127.0.0.1:owner"]
    for _ in range(3):
        limiter.record_failure(keys)
    assert limiter.retry_after(keys) > 0
    limiter.reset(keys)
    assert limiter.retry_after(keys) == 0
