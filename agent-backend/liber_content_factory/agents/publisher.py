"""
Publisher Agent — Content Distribution.

Dispatches formatted content to target platforms and saves the
selected item with its embedding to published history.
"""

from typing import AsyncGenerator

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions


class PublisherAgent(BaseAgent):
    """Publishes content to platforms by calling the publish_content_tool."""

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        from liber_content_factory.tools.publish_tool import publish_content_tool
        from google.adk.tools import ToolContext
        tool_ctx = ToolContext(ctx)
        await publish_content_tool(tool_ctx)
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "published_urls": tool_ctx.state.get("published_urls", [])
            })
        )
