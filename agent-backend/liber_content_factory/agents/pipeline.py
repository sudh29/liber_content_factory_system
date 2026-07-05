"""
Pipeline Assembly — Orchestration Hub.

Wires all individual agents into the full sequential pipeline,
defines the RootAgent that intercepts user messages, and creates
the ADK App entry point.
"""

import logging
from typing import AsyncGenerator

from google.adk.agents import SequentialAgent, BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.apps import App
from google.adk.events import Event, EventActions

# Import all agents
from liber_content_factory.agents.planner import planner_agent
from liber_content_factory.agents.duplicate_detector import DuplicateDetectorAgent
from liber_content_factory.agents.ranker import ranker_agent
from liber_content_factory.agents.researcher import researcher_agent
from liber_content_factory.agents.refinement_loop import refinement_loop
from liber_content_factory.agents.formatters import formatters, ConsolidationAgent
from liber_content_factory.agents.media_generator import MediaGeneratorAgent
from liber_content_factory.agents.publisher import PublisherAgent

logger = logging.getLogger(__name__)


# --- State Initialization Callback ---

async def init_pipeline_state(callback_context: CallbackContext) -> None:
    """Resolves the content strategy by name and populates all prompt/criteria state keys."""
    # If strategy_name is not in state, default to "quotes"
    strategy_name = callback_context.state.get("strategy_name", "quotes")

    # Import strategy plugins dynamically
    from liber_content_factory.strategies.quotes import DailyQuoteStrategy
    from liber_content_factory.strategies.generic import GenericContentStrategy

    if strategy_name == "quotes":
        strategy = DailyQuoteStrategy()
        callback_context.state["generation_prompt"] = (
            "Provide:\n1. A meaningful explanation of the quote.\n2. Practical life lessons.\n3. Suggested hashtags.\n4. Strong Call-To-Action (CTA)."
        )
    else:
        strategy = GenericContentStrategy(strategy_name)
        callback_context.state["generation_prompt"] = (
            f"Write content optimized for {strategy_name} and provide:\n1. Full optimized structure.\n2. At least 3 hashtags.\n3. A strong CTA."
        )

    callback_context.state["discovery_prompt"] = strategy.get_discovery_prompt(callback_context.state.get("temp:input_query", ""))
    callback_context.state["validation_prompt"] = strategy.get_validation_prompt()
    callback_context.state["ranking_criteria"] = strategy.get_ranking_criteria()

    rules = strategy.get_formatting_rules()
    callback_context.state["formatting_rules_twitter"] = rules.get("twitter", "")
    callback_context.state["formatting_rules_linkedin"] = rules.get("linkedin", "")
    callback_context.state["formatting_rules_instagram"] = rules.get("instagram", "")


# --- Pipeline Assembly ---

pipeline = SequentialAgent(
    name="content_factory_pipeline",
    sub_agents=[
        planner_agent,
        DuplicateDetectorAgent(name="duplicate_detector"),
        ranker_agent,
        researcher_agent,
        refinement_loop,
        formatters,
        ConsolidationAgent(name="consolidation"),
        MediaGeneratorAgent(name="media_generator"),
        PublisherAgent(name="publisher")
    ]
)

pipeline.before_agent_callback = init_pipeline_state


# --- Root Agent ---

class RootAgent(BaseAgent):
    """Intercepts the user's run call, extracts the message, and delegates to the pipeline."""

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        user_message = ""
        if ctx.session.events:
            last_event = ctx.session.events[-1]
            if hasattr(last_event, "content") and last_event.content:
                if hasattr(last_event.content, "parts") and last_event.content.parts:
                    user_message = "".join([p.text for p in last_event.content.parts if p.text])
                elif isinstance(last_event.content, str):
                    user_message = last_event.content

        yield Event(
            author=self.name,
            actions=EventActions(state_delta={"temp:input_query": user_message})
        )

        async for event in pipeline.run_async(ctx):
            yield event


# --- ADK App Entry Point ---

app = App(
    name="app",
    root_agent=RootAgent(name="root_agent")
)
