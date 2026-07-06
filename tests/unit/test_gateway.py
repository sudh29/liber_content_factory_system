"""
Unit tests for API Gateway Security layer.
"""

from unittest.mock import MagicMock, patch
import pytest

from liber_content_factory.security.gateway import (
    RateLimiter,
    AuthGateway,
    check_request_security,
    get_rate_limiter,
)


def test_rate_limiter():
    limiter = RateLimiter()
    ip = "192.168.1.100"
    limit = 3

    assert limiter.is_allowed(ip, limit) is True
    assert limiter.is_allowed(ip, limit) is True
    assert limiter.is_allowed(ip, limit) is True
    # 4th request should exceed limit
    assert limiter.is_allowed(ip, limit) is False

    # Different IP should still be allowed
    assert limiter.is_allowed("10.0.0.1", limit) is True

    limiter.reset()
    assert limiter.is_allowed(ip, limit) is True


def test_auth_gateway(monkeypatch):
    # When API_GATEWAY_TOKEN is not set or empty, all requests allowed
    monkeypatch.setenv("API_GATEWAY_TOKEN", "")
    assert AuthGateway.is_authorized({}) is True

    # When token is set
    monkeypatch.setenv("API_GATEWAY_TOKEN", "secret-token-123")
    assert AuthGateway.is_authorized({}) is False
    assert AuthGateway.is_authorized({"Authorization": "Bearer wrong-token"}) is False
    assert AuthGateway.is_authorized({"Authorization": "Bearer secret-token-123"}) is True
    assert AuthGateway.is_authorized({"X-API-Key": "secret-token-123"}) is True


def test_check_request_security(monkeypatch):
    limiter = get_rate_limiter()
    limiter.reset()

    monkeypatch.setenv("API_GATEWAY_TOKEN", "prod-key")
    monkeypatch.setenv("RATE_LIMIT_PER_MINUTE", "2")

    handler = MagicMock()
    handler.headers = {}
    handler.client_address = ("1.2.3.4", 12345)

    # 1. Fail auth
    allowed, status, msg = check_request_security(handler)
    assert allowed is False
    assert status == 401

    # 2. Pass auth, within rate limit
    handler.headers = {"Authorization": "Bearer prod-key"}
    allowed, status, msg = check_request_security(handler)
    assert allowed is True
    assert status == 200

    allowed, status, msg = check_request_security(handler)
    assert allowed is True
    assert status == 200

    # 3. Exceed rate limit
    allowed, status, msg = check_request_security(handler)
    assert allowed is False
    assert status == 429
    assert "Rate limit exceeded" in msg
