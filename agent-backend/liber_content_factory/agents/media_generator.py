"""
Media Generator Agent — Media Asset Creation.

Generates visual media assets for the content draft using DALL-E
or a placeholder fallback.
"""

from typing import AsyncGenerator

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions


class MediaGeneratorAgent(BaseAgent):
    """Generates media assets by calling the generate_media_tool."""

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        from liber_content_factory.tools.media_tool import generate_media_tool
        from google.adk.tools import ToolContext
        tool_ctx = ToolContext(ctx)
        await generate_media_tool(tool_ctx)
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "media_paths": tool_ctx.state.get("media_paths", [])
            })
        )
