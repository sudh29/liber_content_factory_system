"""
Publishing route handlers.

Handles /api/publish endpoint.
"""

import os
import json
import uuid
import logging
from http.server import BaseHTTPRequestHandler

from liber_content_factory.services.telegram import publish_to_telegram
from liber_content_factory.services.whatsapp import publish_to_whatsapp
from liber_content_factory.services.webhook import publish_to_webhook, publish_to_slack

logger = logging.getLogger(__name__)


def handle_publish(handler: BaseHTTPRequestHandler, post_data: str) -> None:
    """Handles POST /api/publish."""
    try:
        data = json.loads(post_data)
        data.get('content', {})
        quote = data.get('quote', {})
        platforms = data.get('platforms', [])
        
        quote_id = quote.get('id', str(uuid.uuid4()))
        from typing import Any
        results: dict[str, Any] = {"success": True, "publishedTo": [], "logs": []}
        
        # Telegram
        if 'Telegram' in platforms:
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
            chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
            logs = publish_to_telegram(quote, bot_token, chat_id, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("Telegram")
                
        # WhatsApp (WAHA)
        if 'WhatsApp' in platforms:
            waha_api = os.environ.get('WAHA_API_URL', '')
            waha_session = os.environ.get('WAHA_SESSION', 'default')
            waha_key = os.environ.get('WAHA_API_KEY', '')
            logs = publish_to_whatsapp(quote, waha_api, waha_session, waha_key, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("WhatsApp")
                
        # Generic Webhook
        if 'Webhook' in platforms:
            webhook_url = os.environ.get('WEBHOOK_URL', '')
            logs = publish_to_webhook(quote, webhook_url, platforms, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("Webhook")
                
        # Slack
        if 'Slack' in platforms:
            slack_url = os.environ.get('SLACK_WEBHOOK_URL', '')
            logs = publish_to_slack(quote, slack_url, platforms, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("Slack")
                
        handler.send_response(200)
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps(results).encode())
        
    except json.JSONDecodeError:
        handler.send_response(400)
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode())
    except Exception as e:
        logger.error(f"Publishing error: {e}", exc_info=True)
        handler.send_response(500)
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": f"Publishing failed: {str(e)}"}).encode())
