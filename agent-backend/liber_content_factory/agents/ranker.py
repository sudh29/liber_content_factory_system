import logging
logger = logging.getLogger(__name__)
"""
Ranker Agent — Candidate Scoring.

Evaluates and scores each candidate item on a 0.0-10.0 scale
based on strategy-defined ranking criteria. Selects the top-scoring
item as the chosen candidate.
"""


from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext

from liber_content_factory.agents._shared import gemini_model
from liber_content_factory.core.schemas import ScoringSchema


# --- Agent Declaration ---

ranker_agent = Agent(
    name="ranker_agent",
    model=gemini_model,
    instruction="""Evaluate and score each of the candidate items on a scale from 0.0 to 10.0.

Criteria:
{ranking_criteria}

Candidates:
{candidates_text}""",
    output_schema=ScoringSchema,
    output_key="temp:scoring_raw"
)


# --- Callbacks ---

async def prepare_ranker_input(callback_context: CallbackContext) -> None:
    pass
    candidates = callback_context.state.get("candidate_items", [])
    text = "\n".join([f"{i+1}. {c.get('raw_content')}" for i, c in enumerate(candidates)])
    callback_context.state["candidates_text"] = text


async def process_ranking(callback_context: CallbackContext) -> None:
    candidates = callback_context.state.get("candidate_items", [])
    if not candidates:
        return
    if len(candidates) == 1:
        candidates[0]["score"] = 10.0
        callback_context.state["selected_item"] = candidates[0]
        return

    scoring_raw = callback_context.state.get("temp:scoring_raw")
    scores = []
    if scoring_raw:
        if isinstance(scoring_raw, dict):
            scores = scoring_raw.get("scores", [])
        elif hasattr(scoring_raw, "scores"):
            scores = scoring_raw.scores

    if scores and len(scores) == len(candidates):
        for i, s in enumerate(scores):
            candidates[i]["score"] = s
    else:
        logger.warning(f"Ranker scores length mismatch: got {len(scores)} scores for {len(candidates)} candidates. Falling back to default score 1.0.")
        for c in candidates:
            c["score"] = 1.0

    candidates.sort(key=lambda x: x.get("score", 0.0), reverse=True)
    callback_context.state["candidate_items"] = candidates
    callback_context.state["selected_item"] = candidates[0]


ranker_agent.before_agent_callback = prepare_ranker_input
ranker_agent.after_agent_callback = process_ranking
