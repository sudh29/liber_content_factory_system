"""
Pydantic schemas for ADK agent structured output.

These schemas are used as output_schema in Agent definitions to ensure
the LLM returns properly structured JSON responses.
"""

import uuid
from typing import List, Literal

from pydantic import BaseModel, Field


class DiscoverySchema(BaseModel):
    items: List[str] = Field(description="List of discovered content ideas or items.")
    topic: str = Field(description="The general topic or theme of these items.")


class ScoringSchema(BaseModel):
    scores: List[float] = Field(description="Scores for each candidate from 0.0 to 10.0.")


class EvaluationResult(BaseModel):
    passed: bool = Field(description="True if the draft meets all criteria, False otherwise.")
    feedback: str = Field(description="If passed is False, provide specific actionable feedback on how to improve.")


class Feedback(BaseModel):
    """Represents feedback for a conversation (used by telemetry)."""
    score: int | float
    text: str | None = ""
    log_type: Literal["feedback"] = "feedback"
    service_name: Literal["content-factory"] = "content-factory"
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
