with open("agent-backend/liber_content_factory/agents/ranker.py", "r") as f:
    content = f.read()

# Fix indentation and missing logger import
content = "import logging\nlogger = logging.getLogger(__name__)\n" + content
content = content.replace("if scores and len(scores) == len(candidates):", "    if scores and len(scores) == len(candidates):")

with open("agent-backend/liber_content_factory/agents/ranker.py", "w") as f:
    f.write(content)
