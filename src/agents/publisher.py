"""
Publisher Agent - Dispatches content to various platforms.
"""
import logging
import json
import os
from src.core.models import PipelineContext

logger = logging.getLogger(__name__)

HISTORY_FILE = "output/published_history.json"

async def publish_content(context: PipelineContext) -> PipelineContext:
    if not context.formatted_content:
        logger.warning("No formatted content to publish.")
        return context

    logger.info("Publisher Agent: Publishing content...")

    # In a real implementation, you would use Tweepy for Twitter, LinkedIn API, etc.
    for platform, content in context.formatted_content.items():
        logger.info(f"Mock Publishing to {platform}:")
        logger.info(f"---\n{content}\n---")

        # Append mock URLs
        context.published_urls.append(f"https://{platform}.com/mock_post_id")

    # Save to history for duplicate detection in the future
    if context.selected_item:
        try:
            os.makedirs("output", exist_ok=True)
            history = []
            if os.path.exists(HISTORY_FILE):
                with open(HISTORY_FILE, "r") as f:
                    history = json.load(f)

            history.append({
                "raw_content": context.selected_item.raw_content,
                "topic": context.topic,
                "urls": context.published_urls
            })

            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
            logger.info("Saved item to published history.")
        except Exception as e:
            logger.warning(f"Failed to update history file: {e}")

    return context
