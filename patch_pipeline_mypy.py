with open("agent-backend/liber_content_factory/agents/pipeline.py", "r") as f:
    content = f.read()

import re

replace = """    if strategy_name == "quotes":
        strategy: Any = DailyQuoteStrategy()"""
content = re.sub(r'    if strategy_name == "quotes":\n        strategy = DailyQuoteStrategy\(\) # type: ignore', replace, content)

replace_import = """from typing import AsyncGenerator, Any"""
content = content.replace("from typing import AsyncGenerator", replace_import)

with open("agent-backend/liber_content_factory/agents/pipeline.py", "w") as f:
    f.write(content)
