"""
Fallback Content Generation Service.

Provides a synchronous, non-ADK fallback generation mechanism for legacy
clients or when the main ADK pipeline is unavailable.
"""

import json
import logging
from google import genai
from google.genai import types
from google.genai.errors import ClientError

from liber_content_factory.config.settings import load_config
from liber_content_factory.core.models import ContentItem
from liber_content_factory.strategies import get_strategy

logger = logging.getLogger(__name__)


def generate_fallback_content(prompt_text: str, quote: dict, strategy_name: str = "quotes") -> dict:
    """Generates content without using the ADK pipeline (fallback mechanism).

    Args:
        prompt_text: Optional user prompt to guide generation.
        quote: The selected quote data.
        strategy_name: The strategy to use (default: 'quotes').

    Returns:
        dict containing the generated draft and any evaluation metrics.
    """
    logger.info("Starting FALLBACK content generation.")
    config = load_config()

    try:
        strategy = get_strategy(strategy_name)
    except ValueError as e:
        logger.warning(f"Invalid strategy requested: {e}. Falling back to 'quotes'.")
        strategy = get_strategy("quotes")

    client = genai.Client()
    quote_text = quote.get("text", "") if isinstance(quote, dict) else str(quote)
    quote_author = quote.get("author", "") if isinstance(quote, dict) else ""
    item = ContentItem(raw_content=f"{quote_text} — {quote_author}".strip(" —"))
    generation_prompt = strategy.get_generation_prompt(
        research_data="No background research available (fallback mode).",
        item=item,
    )

    if prompt_text:
        generation_prompt += f"\n\nAdditional instructions from user:\n{prompt_text}"

    try:
        logger.info("FALLBACK Generator: Requesting draft...")
        response = client.models.generate_content(
            model=config.model,
            contents=generation_prompt,
        )
        draft = response.text
        logger.info("FALLBACK Generator: Draft created.")

        # Simplified validation
        logger.info("FALLBACK Validator: Checking draft...")
        val_prompt = strategy.get_validation_prompt()
        val_schema = {
            "type": "object",
            "properties": {
                "passed": {"type": "boolean", "description": "True if criteria met, else False."},
                "feedback": {"type": "string", "description": "Specific feedback if failed."}
            },
            "required": ["passed", "feedback"]
        }

        val_req = f"Evaluate this draft:\n\n{draft}\n\nCriteria:\n{val_prompt}"
        val_response = client.models.generate_content(
            model=config.model,
            contents=val_req,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=val_schema,
                temperature=0.1
            )
        )

        passed = False
        try:
            val_data = json.loads(val_response.text)
            passed = val_data.get("passed", False)
            logger.info(f"FALLBACK Validator result: passed={passed}")
        except Exception as e:
            logger.warning(f"FALLBACK Validator failed to parse JSON: {e}")

        # Simplified formatting
        formatted_content = {}
        rules = strategy.get_formatting_rules()
        for platform, rule in rules.items():
            logger.info(f"FALLBACK Formatter: Adapting for {platform}...")
            fmt_req = f"Format this content for {platform}.\nOriginal:\n{draft}\nRules:\n{rule}"
            fmt_res = client.models.generate_content(
                model=config.model,
                contents=fmt_req
            )
            formatted_content[platform] = fmt_res.text

        return {
            "draft": draft,
            "formatted": formatted_content,
            "evaluation": {
                "passed": passed,
                "latency": 0.0,
                "cost": 0.0
            },
            "platforms": list(rules.keys())
        }
    except ClientError as exc:
        logger.warning("Gemini quota exhausted in fallback generation: %s", exc)
        fallback_draft = (
            f"I’m temporarily unable to generate the full draft because the Gemini service is rate-limited. "
            f"Please try again shortly."
        )
        return {
            "draft": fallback_draft,
            "formatted": {
                "twitter": fallback_draft,
                "linkedin": fallback_draft,
                "instagram": fallback_draft,
            },
            "evaluation": {
                "passed": False,
                "latency": 0.0,
                "cost": 0.0,
            },
            "platforms": ["twitter", "linkedin", "instagram"],
            "error": "gemini_quota_exhausted",
        }
