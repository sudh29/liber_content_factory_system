"""
Ranker Agent - Scores candidates based on strategy criteria.
"""
import logging
from typing import List
from google.genai import types
from pydantic import BaseModel, Field

from src.core.models import PipelineContext
from src.core.strategy import ContentStrategy

logger = logging.getLogger(__name__)

class ScoringSchema(BaseModel):
    scores: List[float] = Field(description="Scores for each candidate from 0.0 to 10.0.")

async def rank_candidates(client, model: str, context: PipelineContext, strategy: ContentStrategy) -> PipelineContext:
    logger.info("Ranker Agent: Scoring candidates...")

    if not context.candidate_items:
        raise ValueError("No candidate items to rank.")

    if len(context.candidate_items) == 1:
        context.candidate_items[0].score = 10.0
        context.selected_item = context.candidate_items[0]
        logger.info("Only one candidate. Skipping ranking.")
        return context

    criteria = strategy.get_ranking_criteria()
    items_text = "\n".join([f"{i+1}. {item.raw_content}" for i, item in enumerate(context.candidate_items)])

    prompt = f"""Evaluate and score each of the following candidate items on a scale from 0.0 to 10.0.

Criteria:
{criteria}

Candidates:
{items_text}
"""

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ScoringSchema,
                temperature=0.1,
            ),
        )

        if hasattr(response, 'parsed') and response.parsed:
            result = response.parsed
        else:
            result = ScoringSchema.model_validate_json(response.text)

        scores = result.scores
        if len(scores) != len(context.candidate_items):
             logger.warning("Score list length mismatch. Falling back to default scores.")
             scores = [1.0] * len(context.candidate_items)

        for i, item in enumerate(context.candidate_items):
            item.score = scores[i]

        context.candidate_items.sort(key=lambda x: x.score, reverse=True)
        context.selected_item = context.candidate_items[0]
        logger.info(f"Selected highest-scoring item with score {context.selected_item.score}.")

    except Exception as e:
        logger.warning(f"Ranking failed: {e}. Selecting first item by default.")
        context.selected_item = context.candidate_items[0]

    return context
