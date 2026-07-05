from pydantic import BaseModel, Field
from typing import List

class DiscoverySchema(BaseModel):
    items: List[str] = Field(description="List of discovered content ideas or items.")
    topic: str = Field(description="The general topic or theme of these items.")

class ScoringSchema(BaseModel):
    scores: List[float] = Field(description="Scores for each candidate from 0.0 to 10.0.")

class EvaluationResult(BaseModel):
    passed: bool = Field(description="True if the draft meets all criteria, False otherwise.")
    feedback: str = Field(description="If passed is False, provide specific actionable feedback on how to improve.")
