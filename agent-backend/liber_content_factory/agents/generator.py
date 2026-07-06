"""
Generator Agent — Content Draft Generator.

Creates the initial content draft based on the strategy's generation prompt,
research data, and selected candidate. Supports revision feedback from
the validation loop.
"""


from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext

from liber_content_factory.agents._shared import gemini_model


# --- Agent Declaration ---

generator_agent = Agent(
    name="generator_agent",
    model=gemini_model,
    instruction="""You are an expert AI Content Generator. Create the initial draft.

Strategy Guidance:
{generation_prompt}

Background Research/Context:
{research_data}

Candidate Content:
{selected_raw_content}
{revision_feedback_instruction}""",
    output_key="draft"
)


# --- Callbacks ---

async def prepare_generator_input(callback_context: CallbackContext) -> None:
    pass
    feedback = callback_context.state.get("revision_feedback")
    if feedback:
        callback_context.state["revision_feedback_instruction"] = (
            f"\n\nPrevious draft was rejected with the following feedback. Please fix the issues and revise:\n{feedback}"
        )
    else:
        callback_context.state["revision_feedback_instruction"] = ""

generator_agent.before_agent_callback = prepare_generator_input
