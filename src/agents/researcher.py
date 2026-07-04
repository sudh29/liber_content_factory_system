"""
Researcher Agent - Collects additional facts/context via web search if necessary.
"""
import logging
from google.genai import types
from src.core.models import PipelineContext

logger = logging.getLogger(__name__)

async def research_topic(client, model: str, context: PipelineContext) -> PipelineContext:
    if not context.selected_item:
        return context

    logger.info("Researcher Agent: Conducting background research on selected item...")

    prompt = f"Conduct web research to find interesting facts, context, or background information related to this: '{context.selected_item.raw_content}'. Summarize the findings concisely."

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}],
            ),
        )
        context.research_data = response.text or "No additional context found."
        logger.info("Research completed.")
    except Exception as e:
        logger.warning(f"Research failed: {e}")
        context.research_data = "No additional context found due to an error."

    return context
