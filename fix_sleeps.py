import os
import re

agents_dir = "agent-backend/liber_content_factory/agents"

for filename in os.listdir(agents_dir):
    if filename.endswith(".py"):
        filepath = os.path.join(agents_dir, filename)
        with open(filepath, "r") as f:
            content = f.read()

        # Some callbacks literally just have `await asyncio.sleep(5.0)`.
        # When removing this, they become empty functions. We need a `pass` there.
        # But we must preserve any OTHER logic inside the function!

        lines = content.split('\n')
        new_lines = []
        for line in lines:
            if "await asyncio.sleep(5.0)" in line:
                # Replace with pass (but preserve indentation)
                new_lines.append(line.replace("await asyncio.sleep(5.0)", "pass"))
            else:
                new_lines.append(line)

        new_content = '\n'.join(new_lines)
        if content != new_content:
            with open(filepath, "w") as f:
                f.write(new_content)
