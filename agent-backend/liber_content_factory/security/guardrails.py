"""
Security Guardrails for Content Factory.

Input and output validation to prevent prompt injection and ensure
generated content meets safety standards.
"""

import logging
from typing import Dict, Any

from liber_content_factory.config.constants import MAX_INPUT_LENGTH

logger = logging.getLogger(__name__)


def validate_input_safety(input_data: Dict[str, Any]) -> bool:
    """
    Validates input data against basic injection and size constraints.
    Returns True if safe, False otherwise.
    """
    # 1. Size constraint
    if "prompt" in input_data and len(input_data["prompt"]) > MAX_INPUT_LENGTH:
        logger.warning("Input rejected: Exceeds maximum length.")
        return False

    # 2. Basic injection keyword blocking (very naive approach)
    blocked_keywords = ["ignore previous instructions", "system prompt", "bypass", "jailbreak"]
    prompt_text = input_data.get("prompt", "").lower()
    if any(keyword in prompt_text for keyword in blocked_keywords):
        logger.warning(f"Input rejected: Detected blocked keyword in prompt.")
        return False

    return True


def validate_output_safety(output_text: str) -> bool:
    """
    Validates generated output against PII leaks and harmful content.
    Returns True if safe, False otherwise.
    """
    # 1. Size sanity check
    if len(output_text) < 10:
        logger.warning("Output rejected: Too short.")
        return False

    # 2. Blocklist check (simulated harmful content filter)
    harmful_keywords = ["hate speech", "violence", "explicit content"]
    text_lower = output_text.lower()
    if any(keyword in text_lower for keyword in harmful_keywords):
        logger.warning("Output rejected: Detected harmful keyword.")
        return False

    return True
