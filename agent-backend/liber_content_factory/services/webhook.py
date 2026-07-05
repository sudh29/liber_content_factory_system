"""
Webhook and Slack Publishing Services.

Handles generic HTTP webhooks and Slack incoming webhooks.
"""

import json
import urllib.request
import time
from datetime import datetime, timezone


def publish_to_webhook(quote: dict, webhook_url: str, platforms: list[str], quote_id: str) -> list[dict]:
    """Publishes a quote to a generic webhook endpoint.

    Args:
        quote: The quote dictionary containing 'text', 'author', and 'category'.
        webhook_url: Target URL for the POST request.
        platforms: List of platforms being published to.
        quote_id: Internal ID for logging.

    Returns:
        List of audit logs generated during this operation.
    """
    logs = []
    if not webhook_url:
        return logs

    try:
        payload = json.dumps({
            "event": "quote_publish",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "quote": quote["text"],
            "author": quote["author"],
            "category": quote.get("category", "General"),
            "platforms": platforms
        }).encode('utf-8')

        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req) as response:
            pass  # consume response

        logs.append({
            "id": f"log_web_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "SUCCESS",
            "message": f"Generic Webhook Dispatched: POST success on target address {webhook_url}",
            "quoteId": quote_id
        })
    except Exception as web_err:
        logs.append({
            "id": f"log_web_err_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": f"Generic Webhook API Error: {web_err}",
            "quoteId": quote_id
        })

    return logs


def publish_to_slack(quote: dict, slack_webhook_url: str, platforms: list[str], quote_id: str) -> list[dict]:
    """Publishes a notification to a Slack incoming webhook.

    Args:
        quote: The quote dictionary containing 'text' and 'author'.
        slack_webhook_url: Target URL for the Slack webhook.
        platforms: List of platforms being published to.
        quote_id: Internal ID for logging.

    Returns:
        List of audit logs generated during this operation.
    """
    logs = []
    if not slack_webhook_url:
        return logs

    try:
        payload = json.dumps({
            "text": f"🔔 *Content Factory Release:* \"{quote['text']}\" — *{quote['author']}* (Broadcast to {', '.join(platforms)})"
        }).encode('utf-8')

        req = urllib.request.Request(
            slack_webhook_url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req) as response:
            pass

        logs.append({
            "id": f"log_slack_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "SUCCESS",
            "message": f"Slack Integration: Transmitted notification payload successfully to webhook channel.",
            "quoteId": quote_id
        })
    except Exception as slack_err:
        logs.append({
            "id": f"log_slack_err_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": f"Slack API Error: {slack_err}",
            "quoteId": quote_id
        })

    return logs
