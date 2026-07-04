"""
Duplicate Detection Agent - Checks history of published content to avoid repetition.
"""
import logging
import os
import json
from src.core.models import PipelineContext

logger = logging.getLogger(__name__)

HISTORY_FILE = "output/published_history.json"

async def filter_duplicates(context: PipelineContext) -> PipelineContext:
    logger.info("Duplicate Detection Agent: Filtering candidates against history...")

    if not os.path.exists(HISTORY_FILE):
        logger.info("No history file found. Skipping duplicate detection.")
        return context

    try:
        with open(HISTORY_FILE, "r") as f:
            history = json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read history file: {e}")
        history = []

    filtered = []
    for item in context.candidate_items:
        # Simple exact match for now. In a real system, use embeddings/similarity search.
        if any(h.get("raw_content") == item.raw_content for h in history):
            logger.info(f"Filtered duplicate item: {item.raw_content[:50]}...")
        else:
            filtered.append(item)

    context.candidate_items = filtered
    logger.info(f"{len(context.candidate_items)} items remaining after duplicate check.")
    return context
