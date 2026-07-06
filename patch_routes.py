import re

with open("agent-backend/liber_content_factory/api/content_routes.py", "r") as f:
    content = f.read()

# Fix handler responses to use the same CORS headers logic or fallback. Wait, actually we can just leave the hardcoded CORS in content_routes or remove them if server.py does it... Wait, server.py calls these and passes `self` as `handler`, so `handler._set_cors_headers()` can be called if we change it. But for safety, let's just make sure we add session_id to the JSON result.

replace_session = """            result = {
                "draft": draft,
                "formatted": formatted,
                "evaluation": {
                    "passed": passed,
                    "latency": time.time() - start_time,
                    "cost": 0.0
                },
                "platforms": list(formatted.keys()),
                "media": media,
                "session_id": session_id
            }"""

content = re.sub(r'            result = \{\n                "draft": draft,.*?"media": media\n            \}', replace_session, content, flags=re.DOTALL)

with open("agent-backend/liber_content_factory/api/content_routes.py", "w") as f:
    f.write(content)
