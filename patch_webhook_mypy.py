with open("agent-backend/liber_content_factory/services/webhook.py", "r") as f:
    content = f.read()

content = content.replace("    logs = []", "    logs: list[dict[str, str]] = []")

with open("agent-backend/liber_content_factory/services/webhook.py", "w") as f:
    f.write(content)
