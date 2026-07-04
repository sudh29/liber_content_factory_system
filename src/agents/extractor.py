"""
Context Extractor Agent — converts raw input into structured data.

Uses Gemini's structured output with a Pydantic schema to extract
core arguments, supporting evidence, and knowledge gaps.
"""

import logging
from pydantic import BaseModel, Field
from google.genai import types

logger = logging.getLogger(__name__)


class ExtractionSchema(BaseModel):
    """Structured extraction result from raw content input."""
    core_arguments: list[str] = Field(
        min_length=1, max_length=10,
        description="The main thesis and arguments extracted from the input."
    )
    supporting_evidence: list[str] = Field(
        max_length=10,
        description="Data points or quotes that support the thesis."
    )
    knowledge_gaps: list[str] = Field(
        max_length=5,
        description="Topics mentioned that lack sufficient detail or require verification."
    )


async def extract_context(client, model: str, raw_input: str) -> ExtractionSchema:
    """
    Extract structured context from unstructured raw input.

    Uses Gemini structured output with retry logic for transient parsing failures.

    Args:
        client: Initialized google.genai.Client instance.
        model: Gemini model name to use.
        raw_input: Raw text to extract context from.

    Returns:
        ExtractionSchema with extracted arguments, evidence, and gaps.

    Raises:
        Exception: If all retry attempts fail.
    """
    logger.info("Extracting structured context from raw input...")

    max_retries = 2
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=raw_input,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ExtractionSchema,
                    temperature=0.2,
                ),
            )

            # The SDK automatically parses the JSON into the Pydantic model if returned as parsed
            if hasattr(response, 'parsed') and response.parsed:
                return response.parsed

            # Fallback parsing if needed
            return ExtractionSchema.model_validate_json(response.text)

        except Exception as e:
            last_error = e
            logger.warning(f"Parsing failed on attempt {attempt + 1}/{max_retries}: {e}")

    # All retries exhausted — raise the last error instead of returning None
    raise RuntimeError(
        f"Context extraction failed after {max_retries} attempts"
    ) from last_error
