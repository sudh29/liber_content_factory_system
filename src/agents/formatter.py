"""
Formatter Agent - Adapts the core draft for different platforms.
"""
import logging
from src.core.models import PipelineContext
from src.core.strategy import ContentStrategy

logger = logging.getLogger(__name__)

async def format_content(client, model: str, context: PipelineContext, strategy: ContentStrategy) -> PipelineContext:
    if not context.draft:
        raise ValueError("No draft to format.")

    logger.info("Formatter Agent: Adapting content for platforms...")
    rules = strategy.get_formatting_rules()

    if not rules:
        logger.info("No formatting rules provided. Using raw draft.")
        context.formatted_content["default"] = context.draft
        return context

    for platform, rule in rules.items():
        prompt = f"""Format the following content for {platform}.

Original Content:
{context.draft}

Platform Rules:
{rule}"""

        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
            )
            context.formatted_content[platform] = response.text or context.draft
            logger.info(f"Formatted content for {platform}.")
        except Exception as e:
            logger.warning(f"Formatting for {platform} failed: {e}. Using raw draft.")
            context.formatted_content[platform] = context.draft

    return context
