"""
API Gateway Security implementation.

Provides thread-safe IP rate limiting and optional API token authentication
for production generation endpoints.
"""

import time
import threading
import logging
from typing import Any

from liber_content_factory.config.settings import load_config

logger = logging.getLogger(__name__)


class RateLimiter:
    """Thread-safe sliding window IP rate limiter."""

    def __init__(self):
        self._lock = threading.Lock()
        self._request_timestamps: dict[str, list[float]] = {}

    def is_allowed(self, client_ip: str, limit_per_minute: int) -> bool:
        """Check if client IP is within allowed request limit per minute."""
        now = time.monotonic()
        with self._lock:
            timestamps = self._request_timestamps.get(client_ip, [])
            # Prune timestamps older than 60 seconds
            valid_timestamps = [ts for ts in timestamps if now - ts < 60.0]
            if len(valid_timestamps) >= limit_per_minute:
                self._request_timestamps[client_ip] = valid_timestamps
                logger.warning(f"Rate limit exceeded for IP {client_ip} ({len(valid_timestamps)} >= {limit_per_minute}/min)")
                return False
            
            valid_timestamps.append(now)
            self._request_timestamps[client_ip] = valid_timestamps
            return True

    def reset(self):
        """Reset all rate limiter records (useful for testing)."""
        with self._lock:
            self._request_timestamps.clear()


class AuthGateway:
    """API Gateway authentication validator."""

    @staticmethod
    def is_authorized(headers: Any) -> bool:
        """Check if request contains valid API gateway credentials when configured."""
        try:
            config = load_config()
        except Exception:
            return True  # Fallback allow if config loading fails

        token = config.api_gateway_token
        if not token:
            # Authentication disabled (default for local dev/demo mode)
            return True

        auth_header = None
        api_key_header = None
        if hasattr(headers, "get"):
            auth_header = headers.get("Authorization")
            api_key_header = headers.get("X-API-Key")

        if auth_header and auth_header == f"Bearer {token}":
            return True
        if api_key_header and api_key_header == token:
            return True

        logger.warning("Unauthorized request to secure endpoint: missing or invalid token.")
        return False


# Singleton rate limiter instance for active process
_rate_limiter = RateLimiter()


def check_request_security(handler: Any) -> tuple[bool, int, str]:
    """Perform pre-flight security checks on an incoming request handler.

    Args:
        handler: HTTP request handler instance (e.g. BaseHTTPRequestHandler).

    Returns:
        tuple[bool, int, str]: (is_allowed, status_code, error_message)
    """
    # 1. Check authentication
    headers = getattr(handler, "headers", {})
    if not AuthGateway.is_authorized(headers):
        return False, 401, "Unauthorized: Invalid or missing API gateway token."

    # 2. Check rate limit
    try:
        config = load_config()
        limit = getattr(config, "rate_limit_per_minute", 5)
    except Exception:
        limit = 5

    client_ip = "127.0.0.1"
    if hasattr(handler, "client_address") and handler.client_address:
        client_ip = handler.client_address[0]
    elif hasattr(headers, "get"):
        forwarded = headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()

    if not _rate_limiter.is_allowed(client_ip, limit):
        return False, 429, f"Rate limit exceeded ({limit} req/min). Please wait before generating again."

    return True, 200, "OK"


def get_rate_limiter() -> RateLimiter:
    """Return active singleton rate limiter."""
    return _rate_limiter
