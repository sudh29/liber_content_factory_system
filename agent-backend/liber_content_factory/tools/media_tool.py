"""
Media Generation Tool.

Generates a media asset for the draft using OpenAI DALL-E or a PNG fallback.
"""

import os
import logging
import requests  # type: ignore
import asyncio
from google.adk.tools import ToolContext

from liber_content_factory.config.constants import MEDIA_OUTPUT_DIR

logger = logging.getLogger(__name__)


async def generate_media_tool(tool_context: ToolContext) -> dict:
    """Generates a media asset for the draft using OpenAI DALL-E or a PNG fallback.

    Returns:
        dict with status and media path.
    """
    draft = tool_context.state.get("draft")
    if not draft:
        return {"status": "skipped", "message": "No draft available."}

    prompt = f"Vibrant social media illustration themed around: {draft[:100]}"

    MINIMAL_PNG_BYTES = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4'
        b'\x00\x00\x00\rIDATx\x9cc`\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    MEDIA_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    file_path = str(MEDIA_OUTPUT_DIR / "generated_media_1.png")

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            def call_dalle():
                url = "https://api.openai.com/v1/images/generations"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {openai_key}"
                }
                data = {
                    "model": "dalle-e-3",
                    "prompt": prompt,
                    "n": 1,
                    "size": "1024x1024"
                }
                response = requests.post(url, json=data, headers=headers, timeout=60)
                response.raise_for_status()
                res_data = response.json()
                img_url = res_data["data"][0]["url"]
                img_response = requests.get(img_url, timeout=30)
                img_response.raise_for_status()
                return img_response.content

            loop = asyncio.get_running_loop()
            img_bytes = await loop.run_in_executor(None, call_dalle)
            with open(file_path, "wb") as f:
                f.write(img_bytes)

            tool_context.state["media_paths"] = tool_context.state.get("media_paths", []) + [file_path]
            return {"status": "success", "media_path": file_path}
        except Exception as e:
            logger.warning(f"DALL-E generation failed: {e}. Falling back to placeholder.")

    # Fallback/simulation behavior
    try:
        with open(file_path, "wb") as f:
            f.write(MINIMAL_PNG_BYTES)
        tool_context.state["media_paths"] = tool_context.state.get("media_paths", []) + [file_path]
        return {"status": "success", "media_path": file_path, "placeholder": True}
    except Exception as e:
        logger.error(f"Failed to save placeholder: {e}")
        return {"status": "failed", "error": str(e)}
