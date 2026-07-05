import os
import json
import math
import logging
import requests
import asyncio
from google import genai
from google.adk.tools import ToolContext

logger = logging.getLogger(__name__)

HISTORY_FILE = "output/published_history.json"

async def filter_duplicates_tool(tool_context: ToolContext) -> dict:
    """Filters duplicate candidates using semantic embedding similarity check.
    
    Returns:
        dict with status.
    """
    logger.info("ADK Duplicate Detection Tool: Filtering candidates...")
    candidates = tool_context.state.get("candidate_items", [])
    if not candidates:
        logger.info("No candidates found in state.")
        return {"status": "success", "message": "No candidates to filter."}

    if not os.path.exists(HISTORY_FILE):
        logger.info("No history file found. Skipping duplicate detection.")
        return {"status": "success", "message": "No history file found."}

    try:
        with open(HISTORY_FILE, "r") as f:
            history = json.load(f)
    except Exception as e:
        logger.warning(f"Failed to read history file: {e}")
        history = []

    if not history:
        return {"status": "success", "message": "History is empty."}

    client = genai.Client()
    
    # 1. Backfill history embeddings
    missing_indices = [i for i, h in enumerate(history) if "embedding" not in h and h.get("raw_content")]
    if missing_indices:
        missing_contents = [history[i]["raw_content"] for i in missing_indices]
        try:
            embed_response = await client.aio.models.embed_content(
                model="models/gemini-embedding-001",
                contents=missing_contents
            )
            for idx, emb in zip(missing_indices, embed_response.embeddings):
                history[idx]["embedding"] = emb.values
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to backfill history embeddings: {e}")

    # 2. Embed candidates
    contents_to_embed = [c.get("raw_content") for c in candidates if c.get("raw_content")]
    candidate_embeddings = []
    if contents_to_embed:
        try:
            embed_response = await client.aio.models.embed_content(
                model="models/gemini-embedding-001",
                contents=contents_to_embed
            )
            candidate_embeddings = [emb.values for emb in embed_response.embeddings]
        except Exception as e:
            logger.warning(f"Failed to embed candidates: {e}")

    # 3. Compare similarity
    filtered = []
    SIM_THRESHOLD = 0.85

    for i, item in enumerate(candidates):
        is_duplicate = False
        raw_content = item.get("raw_content", "")
        if i < len(candidate_embeddings) and candidate_embeddings[i]:
            candidate_emb = candidate_embeddings[i]
            for h in history:
                historical_emb = h.get("embedding")
                if not historical_emb:
                    if h.get("raw_content") == raw_content:
                        is_duplicate = True
                        break
                    continue
                dot_product = sum(a * b for a, b in zip(candidate_emb, historical_emb))
                norm_a = math.sqrt(sum(a * a for a in candidate_emb))
                norm_b = math.sqrt(sum(b * b for b in historical_emb))
                similarity = 0.0 if norm_a == 0 or norm_b == 0 else dot_product / (norm_a * norm_b)
                if similarity > SIM_THRESHOLD:
                    is_duplicate = True
                    break
        else:
            if any(h.get("raw_content") == raw_content for h in history):
                is_duplicate = True

        if not is_duplicate:
            filtered.append(item)

    tool_context.state["candidate_items"] = filtered
    return {"status": "success", "remaining_count": len(filtered)}


async def generate_media_tool(tool_context: ToolContext) -> dict:
    """Generates a media asset for the draft using OpenAI DALL-E or a PNG fallback.
    
    Returns:
        dict with status and media path.
    """
    draft = tool_context.state.get("draft")
    if not draft:
        return {"status": "skipped", "message": "No draft available."}

    strategy_name = tool_context.state.get("strategy_name", "quotes")
    prompt = f"Vibrant social media illustration themed around: {draft[:100]}"

    MINIMAL_PNG_BYTES = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4'
        b'\x00\x00\x00\rIDATx\x9cc`\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    output_dir = "output/media"
    os.makedirs(output_dir, exist_ok=True)
    file_path = f"{output_dir}/generated_media_1.png"

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


async def publish_content_tool(tool_context: ToolContext) -> dict:
    """Dispatches formatted content to target platforms and saves the selected item with its embedding to history.
    
    Returns:
        dict with status and published URLs.
    """
    formatted_content = tool_context.state.get("formatted_content", {})
    selected_item = tool_context.state.get("selected_item", {})
    topic = tool_context.state.get("topic", "")

    if not formatted_content:
        return {"status": "skipped", "message": "No formatted content."}

    published_urls = []
    for platform, content in formatted_content.items():
        url = f"https://{platform}.com/mock_post_id"
        published_urls.append(url)
        logger.info(f"Mock published to {platform}: {url}")

    tool_context.state["published_urls"] = published_urls

    if selected_item and "raw_content" in selected_item:
        raw_content = selected_item["raw_content"]
        try:
            os.makedirs("output", exist_ok=True)
            history = []
            if os.path.exists(HISTORY_FILE):
                with open(HISTORY_FILE, "r") as f:
                    history = json.load(f)

            client = genai.Client()
            embedding = None
            try:
                embedding_res = await client.aio.models.embed_content(
                    model="models/gemini-embedding-001",
                    contents=raw_content
                )
                if embedding_res and embedding_res.embeddings:
                    embedding = embedding_res.embeddings[0].values
            except Exception as emb_err:
                logger.warning(f"Embedding failed for published item: {emb_err}")

            history_entry = {
                "raw_content": raw_content,
                "topic": topic,
                "urls": published_urls
            }
            if embedding:
                history_entry["embedding"] = embedding

            history.append(history_entry)
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to update history file: {e}")

    return {"status": "success", "published_urls": published_urls}
