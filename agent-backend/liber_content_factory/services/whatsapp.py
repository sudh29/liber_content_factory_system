"""
WhatsApp (WAHA) Publishing Service.

Handles HTTP communication with the WhatsApp HTTP API (WAHA)
to update the user's status.
"""

import json
import urllib.request
import urllib.error
import time
from datetime import datetime, timezone


def publish_to_whatsapp(quote: dict, waha_api_url: str, waha_session: str, waha_api_key: str, quote_id: str) -> list[dict]:
    """Publishes a quote to WhatsApp Status via WAHA.

    Args:
        quote: The quote dictionary containing 'text' and 'author'.
        waha_api_url: Base URL for the WAHA server.
        waha_session: The WAHA session name.
        waha_api_key: Optional API key for WAHA.
        quote_id: Internal ID for logging.

    Returns:
        List of audit logs generated during this operation.
    """
    logs = []

    if not waha_api_url or not waha_session:
        logs.append({
            "id": f"log_wa_skip_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": "WhatsApp skipped: WAHA_API_URL and WAHA_SESSION must both be set in .env",
            "quoteId": quote_id
        })
        return logs

    try:
        api_base = waha_api_url.rstrip('/')
        url = f"{api_base}/api/{waha_session}/status/text"
        message_text = f"\u201c{quote['text']}\u201d\n\n\u2014 {quote['author']}"
        payload = json.dumps({
            "text": message_text,
            "backgroundColor": "#121b22"
        }).encode('utf-8')

        headers = {'Content-Type': 'application/json'}
        if waha_api_key:
            headers['X-Api-Key'] = waha_api_key

        req = urllib.request.Request(
            url, data=payload,
            headers=headers,
            method='POST'
        )

        with urllib.request.urlopen(req) as response:
            response.read()  # just consume the response

        logs.append({
            "id": f"log_wa_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "SUCCESS",
            "message": f"WhatsApp: Status updated via WAHA (session: {waha_session}).",
            "quoteId": quote_id
        })
    except urllib.error.HTTPError as wa_err:
        err_body = wa_err.read().decode()
        try:
            err_json = json.loads(err_body)
            err_desc = err_json.get("message", err_body)
        except Exception:
            err_desc = err_body
        logs.append({
            "id": f"log_wa_err_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": f"WhatsApp WAHA HTTP {wa_err.code}: {err_desc}",
            "quoteId": quote_id
        })
    except Exception as wa_err:
        logs.append({
            "id": f"log_wa_err_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": f"WhatsApp WAHA Error: {wa_err}",
            "quoteId": quote_id
        })

    return logs
