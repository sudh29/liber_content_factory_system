"""
Media Generator Agent - Creates visual assets if requested by the strategy.
"""
import logging
import os
import requests
from src.core.models import PipelineContext
from src.core.strategy import ContentStrategy

logger = logging.getLogger(__name__)

async def generate_media(client, model: str, context: PipelineContext, strategy: ContentStrategy) -> PipelineContext:
    if not context.draft:
        return context

    media_prompt_template = strategy.get_media_prompt(context.draft)
    if not media_prompt_template:
        logger.info("Media Generator Agent: No media requested by strategy.")
        return context

    logger.info("Media Generator Agent: Generating image using OpenAI (Mock/DALL-E)...")

    # In a real implementation, you would call OpenAI's Image API or similar.
    # For now, we simulate success and save a placeholder or mock.

    # Check if OPENAI_API_KEY is available (even if we just log it)
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        logger.warning("OPENAI_API_KEY not set. Simulating media generation.")

    # Simulate a file being saved
    output_dir = "output/media"
    os.makedirs(output_dir, exist_ok=True)
    file_path = f"{output_dir}/generated_media_1.png"

    with open(file_path, "w") as f:
        f.write("SIMULATED IMAGE DATA")

    context.media_paths.append(file_path)
    logger.info(f"Media generated and saved to {file_path}.")

    return context
