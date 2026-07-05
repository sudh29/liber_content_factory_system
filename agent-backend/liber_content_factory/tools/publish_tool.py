"""
Publishing Tool.

Mock-dispatches formatted content to target platforms (the actual live
publishing is handled by the API services layer). Saves the selected item
with its embedding to the published history.
"""

import json
import logging
from google import genai
from google.adk.tools import ToolContext

from liber_content_factory.config.constants import HISTORY_FILE, OUTPUT_DIR

logger = logging.getLogger(__name__)


async def publish_content_tool(tool_context: ToolContext) -> dict:
    """Dispatches formatted content to target platforms and saves the selected item with its embedding to history.

    Returns:
        dict with status and published URLs.
    """
    formatted_content = tool_context.state.get("formatted_content", {})
    selected_item = tool_context.state.get("selected_item", {})
    topic = tool_context.state.get("topic", "")

    if not formatted_content:
        return {"status": "skipped", "message": "No formatted content."}

    published_urls = []
    for platform, content in formatted_content.items():
        url = f"https://{platform}.com/mock_post_id"
        published_urls.append(url)
        logger.info(f"Mock published to {platform}: {url}")

    tool_context.state["published_urls"] = published_urls

    if selected_item and "raw_content" in selected_item:
        raw_content = selected_item["raw_content"]
        try:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            history = []
            if HISTORY_FILE.exists():
                with open(HISTORY_FILE, "r") as f:
                    history = json.load(f)

            client = genai.Client()
            embedding = None
            try:
                embedding_res = await client.aio.models.embed_content(
                    model="models/gemini-embedding-001",
                    contents=raw_content
                )
                if embedding_res and embedding_res.embeddings:
                    embedding = embedding_res.embeddings[0].values
            except Exception as emb_err:
                logger.warning(f"Embedding failed for published item: {emb_err}")

            history_entry = {
                "raw_content": raw_content,
                "topic": topic,
                "urls": published_urls
            }
            if embedding:
                history_entry["embedding"] = embedding

            history.append(history_entry)
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to update history file: {e}")

    return {"status": "success", "published_urls": published_urls}
