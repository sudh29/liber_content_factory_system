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
from liber_content_factory.api.storage import QUOTES_DB_FILE, read_json_file

logger = logging.getLogger(__name__)


def handle_publish(handler: BaseHTTPRequestHandler, post_data: str) -> None:
    """Handles POST /api/publish."""
    try:
        data = json.loads(post_data)
        data.get('content', {})
        quote = data.get('quote')
        platforms = data.get('platforms', [])
        
        quote_id = data.get('quoteId') or data.get('quote_id')
        if not quote_id and quote:
            quote_id = quote.get('id')
            
        if not quote_id:
            quote_id = str(uuid.uuid4())
            
        # Resolve quote from database if only quoteId is provided
        if not quote and quote_id:
            quotes = read_json_file(QUOTES_DB_FILE)
            for q in quotes:
                if q.get('id') == quote_id:
                    quote = q
                    break
                    
        if not quote:
            quote = {}
            
        from typing import Any
        results: dict[str, Any] = {"success": True, "publishedTo": [], "logs": []}
        
        # Case-insensitive checks
        platforms_lower = [p.lower() for p in platforms]
        
        # Telegram
        if 'telegram' in platforms_lower:
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
            chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
            logs = publish_to_telegram(quote, bot_token, chat_id, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("Telegram")
                
        # WhatsApp (WAHA)
        if 'whatsapp' in platforms_lower:
            waha_api = os.environ.get('WAHA_API_URL', '')
            waha_session = os.environ.get('WAHA_SESSION', 'default')
            waha_key = os.environ.get('WAHA_API_KEY', '')
            logs = publish_to_whatsapp(quote, waha_api, waha_session, waha_key, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("WhatsApp")
                
        # Generic Webhook
        if 'webhook' in platforms_lower:
            webhook_url = os.environ.get('WEBHOOK_URL', '')
            logs = publish_to_webhook(quote, webhook_url, platforms, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("Webhook")
                
        # Slack
        if 'slack' in platforms_lower:
            slack_url = os.environ.get('SLACK_WEBHOOK_URL', '')
            logs = publish_to_slack(quote, slack_url, platforms, quote_id)
            results["logs"].extend(logs)
            if any(l["type"] == "SUCCESS" for l in logs):
                results["publishedTo"].append("Slack")
                
        # Update quote status and save to DB
        if results["publishedTo"] and quote_id and quote:
            # Map database keys and save
            quote["status"] = "Published"
            quote["publishedPlatforms"] = list(set(quote.get("publishedPlatforms", []) + [p.lower() for p in results["publishedTo"]]))
            from datetime import datetime, timezone
            quote["publishedTime"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            
            # Save to db file
            from liber_content_factory.api.storage import write_json_file
            quotes = read_json_file(QUOTES_DB_FILE)
            for i, q in enumerate(quotes):
                if q.get('id') == quote_id:
                    quotes[i].update(quote)
                    break
            write_json_file(QUOTES_DB_FILE, quotes)
            
            # Add updated quote to results
            results["quote"] = quote
                
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
