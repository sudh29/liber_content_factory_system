"""
Formatter Agents — Platform-Specific Content Formatting.

Three platform formatter agents (Twitter, LinkedIn, Instagram) that adapt
the draft for each platform's conventions, plus a ConsolidationAgent that
collects all formatted outputs into a single state dictionary.
"""

from typing import AsyncGenerator

from google.adk.agents import Agent, BaseAgent, ParallelAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions

from liber_content_factory.agents._shared import gemini_model


# --- Twitter Formatter ---

twitter_formatter = Agent(
    name="twitter_formatter",
    model=gemini_model,
    instruction="""Format the following content for twitter.
Original Content:
{draft}

Platform Rules:
{formatting_rules_twitter}""",
    output_key="temp:formatted_twitter"
)


async def prepare_twitter_formatter_input(callback_context: CallbackContext) -> None:
    pass

twitter_formatter.before_agent_callback = prepare_twitter_formatter_input


# --- LinkedIn Formatter ---

linkedin_formatter = Agent(
    name="linkedin_formatter",
    model=gemini_model,
    instruction="""Format the following content for linkedin.
Original Content:
{draft}

Platform Rules:
{formatting_rules_linkedin}""",
    output_key="temp:formatted_linkedin"
)


async def prepare_linkedin_formatter_input(callback_context: CallbackContext) -> None:
    pass

linkedin_formatter.before_agent_callback = prepare_linkedin_formatter_input


# --- Instagram Formatter ---

instagram_formatter = Agent(
    name="instagram_formatter",
    model=gemini_model,
    instruction="""Format the following content for instagram.
Original Content:
{draft}

Platform Rules:
{formatting_rules_instagram}""",
    output_key="temp:formatted_instagram"
)


async def prepare_instagram_formatter_input(callback_context: CallbackContext) -> None:
    pass

instagram_formatter.before_agent_callback = prepare_instagram_formatter_input


# --- Sequential Formatter Chain ---

formatters = ParallelAgent(
    name="formatters",
    sub_agents=[twitter_formatter, linkedin_formatter, instagram_formatter]
)


# --- Consolidation Agent ---

class ConsolidationAgent(BaseAgent):
    """Collects all temp:formatted_* outputs into a single formatted_content dict."""

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        state = ctx.session.state
        formatted = {}
        for platform in ["twitter", "linkedin", "instagram"]:
            val = state.get(f"temp:formatted_{platform}")
            if val:
                formatted[platform] = val
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "formatted_content": formatted
            })
        )
