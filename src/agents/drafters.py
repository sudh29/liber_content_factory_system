"""
Drafting Agents — long-form blog post and short-form social media content.

The long-form drafter operates purely on local context (research + outline).
The short-form drafter uses the linkedin-hook-generator skill for LinkedIn-optimized hooks.
"""

import logging
import subprocess
from pathlib import Path
from typing import Optional

from src.agents.extractor import ExtractionSchema

logger = logging.getLogger(__name__)

# Default skills directory relative to project root
_DEFAULT_SKILLS_DIR = str(Path(__file__).resolve().parent.parent.parent / ".agents" / "skills")


async def draft_long_form(
    client,
    model: str,
    outline: ExtractionSchema,
    research_file_path: Optional[str],
) -> str:
    """
    Draft a comprehensive blog post based on extracted outline and research.

    Operates entirely on local context — no web access.

    Args:
        client: Initialized google.genai.Client instance.
        model: Gemini model name to use.
        outline: Structured extraction with core arguments and evidence.
        research_file_path: Absolute path to the research markdown file, or None.

    Returns:
        The generated blog post as a string.
    """
    logger.info("Drafting long-form content based on local research...")

    research = "No research available."
    if research_file_path:
        try:
            with open(research_file_path, "r", encoding="utf-8") as f:
                research = f.read()
        except Exception as e:
            logger.warning(f"Failed to read research file '{research_file_path}': {e}")

    prompt = f"""Write a comprehensive blog post based on the following outline and research.

Outline:
Core Arguments: {outline.core_arguments}
Supporting Evidence: {outline.supporting_evidence}

Research:
{research}

The blog post should be well-structured, engaging, and detailed."""

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
        )
        return response.text or "# Drafting Error\n\nNo content generated."
    except Exception as e:
        logger.warning(f"Long-form drafting failed: {e}")
        return f"# Drafting Error\n\nFailed to draft content: {e}"


async def draft_short_form(
    client,
    model: str,
    outline: ExtractionSchema,
    feedback: Optional[str] = None,
    skills_dir: Optional[str] = None,
) -> str:
    """
    Generate a short-form social media hook using the linkedin-hook-generator skill.

    Args:
        client: Initialized google.genai.Client instance.
        model: Gemini model name to use.
        outline: Structured extraction with core arguments and evidence.
        feedback: Optional revision feedback from QA validator.
        skills_dir: Path to the skills directory. Defaults to project-relative path.

    Returns:
        The generated social media hook as a string.
    """
    logger.info("Applying Agent Skill: linkedin-hook-generator...")

    if feedback:
        logger.info(f"Incorporating Validator feedback: {feedback}")

    # Resolve skill instructions path
    resolved_skills_dir = skills_dir or _DEFAULT_SKILLS_DIR
    skill_path = Path(resolved_skills_dir) / "linkedin-hook-generator" / "SKILL.md"

    try:
        skill_instructions = skill_path.read_text(encoding="utf-8")
    except Exception as e:
        logger.warning(f"Failed to load skill instructions from '{skill_path}': {e}")
        skill_instructions = "Write a catchy, engaging LinkedIn hook with a clear call to action."

    analyzer_result = "{}"
    script_path = Path(resolved_skills_dir) / "linkedin-hook-generator" / "scripts" / "text_analyzer.py"
    
    if script_path.exists():
        try:
            logger.info(f"Executing skill script: {script_path.name}")
            outline_text = f"Core Arguments: {outline.core_arguments}\nSupporting Evidence: {outline.supporting_evidence}"
            proc = subprocess.run(
                ["python", str(script_path)],
                input=outline_text,
                text=True,
                capture_output=True,
                check=True
            )
            analyzer_result = proc.stdout.strip()
            logger.info("Successfully executed text_analyzer skill tool.")
        except Exception as e:
            logger.warning(f"Failed to execute text_analyzer skill tool: {e}")

    prompt = f"""{skill_instructions}

Outline:
Core Arguments: {outline.core_arguments}
Supporting Evidence: {outline.supporting_evidence}

Analysis from `text_analyzer` tool:
{analyzer_result}"""

    if feedback:
        prompt += (
            f"\n\nPrevious draft was rejected by QA with this feedback: {feedback}. "
            "Please revise and fix the issues."
        )

    try:
        response = await client.aio.models.generate_content(
            model=model,
            contents=prompt,
        )
        return response.text or "Tired of context rot? Try the Content Factory."
    except Exception as e:
        logger.warning(f"Short-form drafting failed: {e}")
        return "Tired of context rot? Try the Content Factory."
