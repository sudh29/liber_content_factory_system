"""
QA Validator Agent — adversarial evaluation of drafted content.

Uses LLM-as-a-Judge pattern with deterministic pre-checks and
semantic evaluation via Gemini structured output.
"""

import logging
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field
from google.genai import types

if TYPE_CHECKING:
    from src.orchestrator import PipelineContext

logger = logging.getLogger(__name__)


class RevisionRequiredError(Exception):
    """Exception raised when the QA Validator rejects drafted content."""
    pass


class EvaluationResult(BaseModel):
    """Structured result from the LLM-as-a-Judge evaluation."""
    passed: bool = Field(
        description="True if the draft meets all criteria, False otherwise."
    )
    feedback: str = Field(
        description="If passed is False, provide specific actionable feedback on how to improve."
    )


async def validate_content(client, model: str, context: "PipelineContext") -> bool:
    """
    Validate drafted content against quality rubrics.

    Performs deterministic checks first (length, presence), then
    delegates to Gemini for semantic evaluation using the
    LLM-as-a-Judge pattern.

    Args:
        client: Initialized google.genai.Client instance.
        model: Gemini model name to use.
        context: PipelineContext containing the drafts and extraction.

    Returns:
        True if validation passes.

    Raises:
        RevisionRequiredError: If the content fails validation with actionable feedback.
    """
    logger.info("Validating drafted content against rubrics...")

    draft = context.short_form_draft
    if not draft:
        raise RevisionRequiredError("Short-form draft is missing.")

    # Deterministic pre-checks
    if len(draft) < 10:
        raise RevisionRequiredError("Content is too short. Minimum 10 characters required.")

    # Semantic evaluation via LLM-as-a-Judge
    core_arg = (
        context.extraction.core_arguments[0]
        if context.extraction and context.extraction.core_arguments
        else "N/A"
    )

    prompt = f"""Evaluate the following short-form social media draft.

Draft:
"{draft}"

Criteria:
1. Must be engaging and catchy.
2. Must be under 280 characters.
3. Must contain a clear call to action (e.g., "Try the Content Factory", "Read our blog").
4. Must be relevant to the core argument: {core_arg}

If it fails any of these criteria, mark passed as false and provide specific feedback."""

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EvaluationResult,
                temperature=0.0,
            ),
        )

        if hasattr(response, 'parsed') and response.parsed:
            result = response.parsed
        else:
            result = EvaluationResult.model_validate_json(response.text)

        if not result.passed:
            raise RevisionRequiredError(result.feedback)

    except RevisionRequiredError:
        raise  # Let revision errors propagate
    except Exception as e:
        # Log the semantic evaluation failure and fail closed.
        logger.error(
            f"Semantic evaluation failed unexpectedly: {e}. "
            "Failing closed to prevent sub-par content emission."
        )
        raise

    logger.info("Content meets all guidelines. Emitting 'Pass' payload.")
    return True
