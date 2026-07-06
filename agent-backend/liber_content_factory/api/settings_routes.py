"""
Settings and utility routes.

Handles /api/credentials and /api/logs endpoints.
"""

import os
import json
import logging
from http.server import BaseHTTPRequestHandler

from liber_content_factory.config.constants import AUDIT_LOG_DIR

logger = logging.getLogger(__name__)


def handle_credentials(handler: BaseHTTPRequestHandler) -> None:
    """Handles GET /api/credentials to check which services are configured."""
    creds_status = {
        "gemini": bool(os.environ.get('GEMINI_API_KEY')),
        "telegram": bool(os.environ.get('TELEGRAM_BOT_TOKEN') and os.environ.get('TELEGRAM_CHAT_ID')),
        "whatsapp": bool(os.environ.get('WAHA_API_URL') and os.environ.get('WAHA_SESSION')),
        "webhook": bool(os.environ.get('WEBHOOK_URL')),
        "slack": bool(os.environ.get('SLACK_WEBHOOK_URL')),
        "openai": bool(os.environ.get('OPENAI_API_KEY'))
    }
    
    handler.send_response(200)
    handler.send_header('Content-type', 'application/json')
    handler.end_headers()
    handler.wfile.write(json.dumps(creds_status).encode())


def handle_logs(handler: BaseHTTPRequestHandler) -> None:
    """Handles GET /api/logs."""
    logs = []
    log_file = AUDIT_LOG_DIR / "publish_logs.json"
    
    if log_file.exists():
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if content:
                    logs = json.loads(content)
        except Exception as e:
            logger.error(f"Error reading logs: {e}")
            
    handler.send_response(200)
    handler.send_header('Content-type', 'application/json')
    handler.end_headers()
    handler.wfile.write(json.dumps({"logs": logs}).encode())
