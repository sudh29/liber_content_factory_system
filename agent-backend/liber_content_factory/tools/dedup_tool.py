"""
Deduplication Tool.

Filters duplicate candidates using semantic embedding similarity checks
against the published history.
"""

import json
import math
import logging
from google import genai
from google.adk.tools import ToolContext

from liber_content_factory.config.constants import HISTORY_FILE, SIMILARITY_THRESHOLD
from liber_content_factory.repositories.storage_repo import get_storage_repository

logger = logging.getLogger(__name__)


async def filter_duplicates_tool(tool_context: ToolContext) -> dict:
    """Filters duplicate candidates using semantic embedding similarity check.

    Returns:
        dict with status.
    """
    logger.info("ADK Duplicate Detection Tool: Filtering candidates...")
    candidates = tool_context.state.get("candidate_items", [])
    if not candidates:
        logger.info("No candidates found in state.")
        return {"status": "success", "message": "No candidates to filter."}

    repo = get_storage_repository()
    history = repo.load_history(file_override=HISTORY_FILE)

    if not history:
        logger.info("History is empty or not found. Skipping duplicate detection.")
        return {"status": "success", "message": "History is empty."}

    client = genai.Client()

    # 1. Backfill history embeddings
    missing_indices = [i for i, h in enumerate(history) if "embedding" not in h and h.get("raw_content")]
    if missing_indices:
        missing_contents = [history[i]["raw_content"] for i in missing_indices]
        try:
            embed_response = await client.aio.models.embed_content(
                model="models/gemini-embedding-001",
                contents=missing_contents
            )
            for idx, emb in zip(missing_indices, embed_response.embeddings):
                history[idx]["embedding"] = emb.values
            repo.save_history(history, file_override=HISTORY_FILE)
        except Exception as e:
            logger.warning(f"Failed to backfill history embeddings: {e}")

    # 2. Embed candidates
    contents_to_embed = [c.get("raw_content") for c in candidates if c.get("raw_content")]
    candidate_embeddings = []
    if contents_to_embed:
        try:
            embed_response = await client.aio.models.embed_content(
                model="models/gemini-embedding-001",
                contents=contents_to_embed
            )
            candidate_embeddings = [emb.values for emb in embed_response.embeddings]
        except Exception as e:
            logger.warning(f"Failed to embed candidates: {e}")

    # 3. Compare similarity
    filtered = []

    for i, item in enumerate(candidates):
        is_duplicate = False
        raw_content = item.get("raw_content", "")
        if i < len(candidate_embeddings) and candidate_embeddings[i]:
            candidate_emb = candidate_embeddings[i]
            for h in history:
                historical_emb = h.get("embedding")
                if not historical_emb:
                    if h.get("raw_content") == raw_content:
                        is_duplicate = True
                        break
                    continue
                dot_product = sum(a * b for a, b in zip(candidate_emb, historical_emb))
                norm_a = math.sqrt(sum(a * a for a in candidate_emb))
                norm_b = math.sqrt(sum(b * b for b in historical_emb))
                similarity = 0.0 if norm_a == 0 or norm_b == 0 else dot_product / (norm_a * norm_b)
                if similarity > SIMILARITY_THRESHOLD:
                    is_duplicate = True
                    break
        else:
            if any(h.get("raw_content") == raw_content for h in history):
                is_duplicate = True

        if not is_duplicate:
            filtered.append(item)

    tool_context.state["candidate_items"] = filtered
    return {"status": "success", "remaining_count": len(filtered)}
