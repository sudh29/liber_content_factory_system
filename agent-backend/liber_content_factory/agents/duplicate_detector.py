"""
Duplicate Detector Agent — Semantic Deduplication.

Filters candidate items by comparing them against published history
using embedding-based similarity. Runs the filter_duplicates_tool
as a custom BaseAgent.
"""

from typing import AsyncGenerator

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions


class DuplicateDetectorAgent(BaseAgent):
    """Removes candidate items that are too similar to previously published content."""

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        from liber_content_factory.tools.dedup_tool import filter_duplicates_tool
        from google.adk.tools import ToolContext
        tool_ctx = ToolContext(ctx)
        await filter_duplicates_tool(tool_ctx)
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "candidate_items": tool_ctx.state.get("candidate_items")
            })
        )
