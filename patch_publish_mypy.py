with open("agent-backend/liber_content_factory/api/publish_routes.py", "r") as f:
    content = f.read()

import re

# Fix mypy type error for results dict
replace = """        results: dict = {"success": True, "publishedTo": [], "logs": []}"""
content = re.sub(r'        results = \{"success": True, "publishedTo": \[\], "logs": \[\]\}', replace, content)

# I can just use Any typing for the results
replace2 = """        from typing import Any
        results: dict[str, Any] = {"success": True, "publishedTo": [], "logs": []}"""
content = re.sub(r'        results: dict = \{"success": True, "publishedTo": \[\], "logs": \[\]\}', replace2, content)


with open("agent-backend/liber_content_factory/api/publish_routes.py", "w") as f:
    f.write(content)
