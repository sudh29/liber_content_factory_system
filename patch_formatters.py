with open("agent-backend/liber_content_factory/agents/formatters.py", "r") as f:
    content = f.read()

content = content.replace(
    "from google.adk.agents import Agent, BaseAgent, SequentialAgent",
    "from google.adk.agents import Agent, BaseAgent, ParallelAgent"
)

content = content.replace(
    "formatters = SequentialAgent(",
    "formatters = ParallelAgent("
)

with open("agent-backend/liber_content_factory/agents/formatters.py", "w") as f:
    f.write(content)
