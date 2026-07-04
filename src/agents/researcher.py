"""
Research Agent — fills knowledge gaps using web search via Gemini.

Queries authoritative sources via Gemini's built-in Google Search tool
and writes results to a Markdown reference document.
"""

import os
import logging
from pathlib import Path
from google.genai import types

logger = logging.getLogger(__name__)


async def research_gaps(
    client,
    model: str,
    gaps: list[str],
    output_dir: str = "output",
) -> str:
    """
    Research knowledge gaps and produce a Markdown reference document.

    Args:
        client: Initialized google.genai.Client instance.
        model: Gemini model name to use.
        gaps: List of knowledge gap descriptions to research.
        output_dir: Directory to write the research document into.

    Returns:
        Absolute path to the generated research document.
    """
    logger.info(f"Researching gaps via Gemini Search: {gaps}")

    prompt = (
        f"Conduct thorough web research on the following knowledge gaps: {gaps}. "
        "Synthesize your findings into a detailed Markdown reference document."
    )

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[{"google_search": {}}],
            ),
        )
        research_doc = response.text or "# Research Notes\n\nNo content returned from search."
    except Exception as e:
        logger.warning(f"Research failed: {e}")
        research_doc = f"# Research Notes\n\nIdentified gaps: {gaps}\n\nResearch failed: {str(e)}"

    # Write to a deterministic, absolute path inside the configured output directory
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    doc_path = out_path / "research_complete.md"

    with open(doc_path, "w", encoding="utf-8") as f:
        f.write(research_doc)

    abs_path = str(doc_path.resolve())
    logger.info(f"Research document saved to: {abs_path}")
    return abs_path
