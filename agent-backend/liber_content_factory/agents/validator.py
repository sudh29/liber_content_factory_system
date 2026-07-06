"""
Validator Agent — Quality Assurance.

Evaluates the generated draft against strategy-defined validation criteria.
Sets validation_passed and revision_feedback in state for the refinement loop.
"""


from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext

from liber_content_factory.agents._shared import gemini_model
from liber_content_factory.core.schemas import EvaluationResult


# --- Agent Declaration ---

validator_agent = Agent(
    name="validator_agent",
    model=gemini_model,
    instruction="""Evaluate the following draft.

Draft:
{draft}

Criteria:
{validation_prompt}

If it fails any of these criteria, mark passed as false and provide specific feedback.""",
    output_schema=EvaluationResult,
    output_key="temp:validation_raw"
)


# --- Callbacks ---

async def prepare_validator_input(callback_context: CallbackContext) -> None:
    pass

validator_agent.before_agent_callback = prepare_validator_input


async def process_validation(callback_context: CallbackContext) -> None:
    val_res = callback_context.state.get("temp:validation_raw")
    if val_res:
        if isinstance(val_res, dict):
            passed = val_res.get("passed", False)
            feedback = val_res.get("feedback", "")
        else:
            passed = val_res.passed
            feedback = val_res.feedback

        callback_context.state["validation_passed"] = passed
        if not passed:
            callback_context.state["revision_feedback"] = feedback
        else:
            callback_context.state["revision_feedback"] = ""

        # Security output safety check
        from liber_content_factory.security.guardrails import validate_output_safety
        draft = callback_context.state.get("draft", "")
        validate_output_safety(draft)

validator_agent.after_agent_callback = process_validation
