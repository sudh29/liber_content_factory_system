"""
Researcher Agent — Web Research.

Conducts web research using Google Search to find interesting facts,
context, or background information related to the selected content item.
"""

import asyncio

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import google_search

from liber_content_factory.agents._shared import gemini_model


# --- Agent Declaration ---

researcher_agent = Agent(
    name="researcher_agent",
    model=gemini_model,
    instruction="""Conduct web research to find interesting facts, context, or background information related to: '{selected_raw_content}'. Summarize the findings concisely.""",
    tools=[google_search],
    output_key="research_data"
)


# --- Callbacks ---

async def prepare_researcher_input(callback_context: CallbackContext) -> None:
    await asyncio.sleep(5.0)
    selected = callback_context.state.get("selected_item", {})
    callback_context.state["selected_raw_content"] = selected.get("raw_content", "")

researcher_agent.before_agent_callback = prepare_researcher_input
