"""
Planner Agent - Uses the strategy's discovery prompt to find/ideate candidate content items.
"""
import logging
from typing import List
from google.genai import types
from pydantic import BaseModel, Field

from src.core.models import ContentItem, PipelineContext
from src.core.strategy import ContentStrategy

logger = logging.getLogger(__name__)

class DiscoverySchema(BaseModel):
    items: List[str] = Field(description="List of discovered content ideas or items.")
    topic: str = Field(description="The general topic or theme of these items.")

async def discover_content(client, model: str, context: PipelineContext, strategy: ContentStrategy) -> PipelineContext:
    logger.info(f"[{strategy.name}] Planner Agent: Discovering content...")

    prompt = strategy.get_discovery_prompt(context.raw_input)

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DiscoverySchema,
                temperature=0.7,
            ),
        )

        if hasattr(response, 'parsed') and response.parsed:
            result = response.parsed
        else:
            result = DiscoverySchema.model_validate_json(response.text)

        context.topic = result.topic
        for item_raw in result.items:
            context.candidate_items.append(ContentItem(raw_content=item_raw))

        logger.info(f"Discovered {len(context.candidate_items)} candidate items for topic '{context.topic}'.")
    except Exception as e:
        logger.error(f"Failed to discover content: {e}")
        raise

    return context
