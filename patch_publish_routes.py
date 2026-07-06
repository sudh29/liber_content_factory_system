with open("agent-backend/liber_content_factory/api/publish_routes.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'bot_token = os.environ.get\(\'TELEGRAM_BOT_TOKEN\'\)\n            chat_id = os.environ.get\(\'TELEGRAM_CHAT_ID\'\)',
    "bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')\n            chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')",
    content
)
content = re.sub(
    r'waha_api = os.environ.get\(\'WAHA_API_URL\'\)\n            waha_session = os.environ.get\(\'WAHA_SESSION\', \'default\'\)\n            waha_key = os.environ.get\(\'WAHA_API_KEY\'\)',
    "waha_api = os.environ.get('WAHA_API_URL', '')\n            waha_session = os.environ.get('WAHA_SESSION', 'default')\n            waha_key = os.environ.get('WAHA_API_KEY', '')",
    content
)
content = re.sub(
    r'webhook_url = os.environ.get\(\'WEBHOOK_URL\'\)',
    "webhook_url = os.environ.get('WEBHOOK_URL', '')",
    content
)
content = re.sub(
    r'slack_url = os.environ.get\(\'SLACK_WEBHOOK_URL\'\)',
    "slack_url = os.environ.get('SLACK_WEBHOOK_URL', '')",
    content
)

with open("agent-backend/liber_content_factory/api/publish_routes.py", "w") as f:
    f.write(content)
