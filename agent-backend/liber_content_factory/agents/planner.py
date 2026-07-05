"""
Planner Agent — Content Discovery.

Generates 5 diverse candidate content ideas/themes using the strategy's
discovery prompt. Parses the structured output into candidate_items state.
"""

import asyncio

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext

from liber_content_factory.agents._shared import gemini_model
from liber_content_factory.core.schemas import DiscoverySchema


# --- Agent Declaration ---

planner_agent = Agent(
    name="planner_agent",
    model=gemini_model,
    instruction="""You are an expert Content Discovery Agent.
Generate 5 diverse candidate content ideas/themes.

Strategy Guidance:
{discovery_prompt}

Format the output strictly as JSON following the DiscoverySchema.""",
    output_schema=DiscoverySchema,
    output_key="temp:discovery_raw"
)


# --- Callbacks ---

async def prepare_planner_input(callback_context: CallbackContext) -> None:
    await asyncio.sleep(5.0)

planner_agent.before_agent_callback = prepare_planner_input


async def process_discovery(callback_context: CallbackContext) -> None:
    discovery_raw = callback_context.state.get("temp:discovery_raw")
    if discovery_raw:
        if isinstance(discovery_raw, dict):
            topic = discovery_raw.get("topic", "")
            items = discovery_raw.get("items", [])
        else:
            topic = discovery_raw.topic
            items = discovery_raw.items
        callback_context.state["topic"] = topic
        callback_context.state["candidate_items"] = [{"raw_content": item} for item in items]

planner_agent.after_agent_callback = process_discovery
