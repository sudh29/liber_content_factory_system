from pydantic import BaseModel, Field

class ExtractionSchema(BaseModel):
    core_arguments: list[str] = Field(description="The main thesis and arguments extracted from the input.")
    supporting_evidence: list[str] = Field(description="Data points or quotes that support the thesis.")
    knowledge_gaps: list[str] = Field(description="Topics mentioned that lack sufficient detail or require verification.")

def extract_context(client, model, raw_input: str) -> ExtractionSchema:
    # Simulated execution
    return ExtractionSchema(
        core_arguments=["Multi-agent systems solve context rot."],
        supporting_evidence=["Single LLM struggles past 40k tokens."],
        knowledge_gaps=["Specifics of the Model Context Protocol (MCP)."]
    )
