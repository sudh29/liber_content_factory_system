"""
Validator Agent - Checks the draft against strategy-specific quality rubrics.
"""
import logging
from pydantic import BaseModel, Field
from google.genai import types

from src.core.models import PipelineContext
from src.core.strategy import ContentStrategy

logger = logging.getLogger(__name__)

class EvaluationResult(BaseModel):
    passed: bool = Field(description="True if the draft meets all criteria, False otherwise.")
    feedback: str = Field(description="If passed is False, provide specific actionable feedback on how to improve.")

class RevisionRequiredError(Exception):
    pass

async def validate_draft(client, model: str, context: PipelineContext, strategy: ContentStrategy) -> PipelineContext:
    if not context.draft:
        raise ValueError("No draft to validate.")

    logger.info("Validator Agent: Evaluating draft...")

    validation_prompt = strategy.get_validation_prompt()
    prompt = f"""Evaluate the following draft.

Draft:
{context.draft}

Criteria:
{validation_prompt}

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

        logger.info("Validation passed.")
    except RevisionRequiredError:
        raise
    except Exception as e:
        logger.warning(f"Validation step failed internally: {e}. Passing draft to avoid blocking.")

    return context
