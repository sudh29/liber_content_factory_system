with open("agent-backend/liber_content_factory/tools/media_tool.py", "r") as f:
    content = f.read()

content = content.replace("import requests", "import requests  # type: ignore")

with open("agent-backend/liber_content_factory/tools/media_tool.py", "w") as f:
    f.write(content)
