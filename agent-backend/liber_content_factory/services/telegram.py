"""
Telegram API Publishing Service.

Handles HTTP communication with the Telegram Bot API to broadcast messages
to configured channels.
"""

import json
import urllib.request
import urllib.error
import time
from datetime import datetime, timezone


def publish_to_telegram(quote: dict, bot_token: str, chat_id: str, quote_id: str) -> list[dict]:
    """Publishes a quote to Telegram.

    Args:
        quote: The quote dictionary containing 'text' and 'author'.
        bot_token: Telegram bot token.
        chat_id: Target chat or channel ID.
        quote_id: Internal ID for logging.

    Returns:
        List of audit logs generated during this operation.
    """
    logs = []

    if not bot_token or not chat_id:
        logs.append({
            "id": f"log_tel_skip_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": "Telegram skipped: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must both be set in .env",
            "quoteId": quote_id
        })
        return logs

    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        message_text = f"\u201c{quote['text']}\u201d\n\n\u2014 {quote['author']}\n\n#dailyquote #philosophy"
        payload = json.dumps({
            "chat_id": chat_id,
            "text": message_text,
            "parse_mode": "HTML"
        }).encode('utf-8')

        req = urllib.request.Request(
            url, data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req) as response:
            tel_response = json.loads(response.read().decode())

        if tel_response.get("ok"):
            logs.append({
                "id": f"log_tel_{int(time.time() * 1000)}",
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "type": "SUCCESS",
                "message": f"Telegram: Message delivered to {chat_id}.",
                "quoteId": quote_id
            })
        else:
            err_desc = tel_response.get("description", "Unknown error from Telegram API")
            logs.append({
                "id": f"log_tel_err_{int(time.time() * 1000)}",
                "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                "type": "ERROR",
                "message": f"Telegram API Error: {err_desc}",
                "quoteId": quote_id
            })
    except urllib.error.HTTPError as tel_err:
        err_body = tel_err.read().decode()
        try:
            err_json = json.loads(err_body)
            err_desc = err_json.get("description", err_body)
        except Exception:
            err_desc = err_body
        logs.append({
            "id": f"log_tel_err_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": f"Telegram HTTP {tel_err.code}: {err_desc}",
            "quoteId": quote_id
        })
    except Exception as tel_err:
        logs.append({
            "id": f"log_tel_err_{int(time.time() * 1000)}",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "type": "ERROR",
            "message": f"Telegram Error: {tel_err}",
            "quoteId": quote_id
        })

    return logs
