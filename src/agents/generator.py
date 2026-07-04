"""
Generator Agent - Creates the initial draft using the strategy's instructions.
"""
import logging
from src.core.models import PipelineContext
from src.core.strategy import ContentStrategy

logger = logging.getLogger(__name__)

async def generate_draft(client, model: str, context: PipelineContext, strategy: ContentStrategy, feedback: str = None) -> PipelineContext:
    if not context.selected_item:
        raise ValueError("No item selected for generation.")

    logger.info("Generator Agent: Drafting content...")

    prompt = strategy.get_generation_prompt(context.research_data or "", context.selected_item)
    if feedback:
        prompt += f"\n\nPrevious draft was rejected with the following feedback. Please fix the issues and revise:\n{feedback}"

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
        )
        context.draft = response.text
        logger.info("Draft generated successfully.")
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise

    return context
