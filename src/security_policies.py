"""
Security policies — input and output guardrails.

Provides regex-based screening for prompt injection attempts and
credential leakage in both user inputs and generated outputs.

Note: Regex-based injection detection is a defense-in-depth layer,
not a complete solution. It should be combined with model-level
safety settings and sandboxed execution.
"""

import re
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.orchestrator import ContentPipeline

logger = logging.getLogger(__name__)

# Maximum allowed input length (characters)
MAX_INPUT_LENGTH = 50_000


class SecurityPolicyViolation(Exception):
    """Exception raised when an input or output violates security guardrails."""
    pass


# --- Pre-compiled regex patterns for performance ---

# Known patterns for prompt injection or jailbreaks
_PROMPT_INJECTION_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\bignore\s+(all\s+)?previous\s+instructions\b",
        r"\bsystem\s+prompt\b",
        r"\bbypass\s+guardrails\b",
        r"\bdeveloper\s+mode\b",
        r"\boutput\s+(all\s+)?secrets\b",
        r"\bprint\s+environment\s+variables\b",
        r"\bdo\s+anything\s+now\b",
        r"\byou\s+are\s+now\s+in\s+.*mode\b",
        r"\bdisregard\s+(all\s+)?(prior|above)\b",
    ]
]

# Patterns for potential secret leakage (e.g. Google API keys, OpenAI keys, AWS keys)
_SECRET_LEAKAGE_PATTERNS = [
    re.compile(pattern)
    for pattern in [
        r"AIza[0-9A-Za-z\-_]{35}",           # Google API Key
        r"sk-[a-zA-Z0-9]{32,}",               # OpenAI / Generic API Key
        r"AKIA[0-9A-Z]{16}",                  # AWS Access Key ID
        r"ghp_[a-zA-Z0-9]{36}",               # GitHub Personal Access Token
    ]
]

# Patterns that may indicate system prompt leakage in output
_SYSTEM_PROMPT_LEAKAGE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"you\s+are\s+a\s+helpful\s+assistant",
        r"your\s+system\s+prompt\s+is",
        r"<<SYS>>",
        r"\[INST\]",
    ]
]


def validate_input_safety(raw_input: str) -> bool:
    """
    Screen user raw input for prompt injections, system prompt extraction,
    or accidental secret leakage.

    Args:
        raw_input: The user-provided input text.

    Returns:
        True if the input passes all checks.

    Raises:
        SecurityPolicyViolation: If a threat is detected.
    """
    logger.info("Running Input Security Guardrails...")

    if not raw_input or not raw_input.strip():
        raise SecurityPolicyViolation("Input is empty or whitespace only.")

    if len(raw_input) > MAX_INPUT_LENGTH:
        raise SecurityPolicyViolation(
            f"Input exceeds maximum length of {MAX_INPUT_LENGTH:,} characters "
            f"(received {len(raw_input):,})."
        )

    for pattern in _PROMPT_INJECTION_PATTERNS:
        if pattern.search(raw_input):
            logger.error(f"Security Alert: Prompt injection pattern detected: '{pattern.pattern}'")
            raise SecurityPolicyViolation(
                "Input rejected by guardrails: potential prompt injection detected."
            )

    for pattern in _SECRET_LEAKAGE_PATTERNS:
        if pattern.search(raw_input):
            logger.error("Security Alert: Secret leakage pattern detected in input.")
            raise SecurityPolicyViolation(
                "Input rejected by guardrails: potential API key or secret detected in prompt."
            )

    logger.info("Input passed all security guardrails.")
    return True


def validate_output_safety(output_text: str, artifact_type: str = "draft") -> bool:
    """
    Screen generated output to ensure no system instructions or secrets were leaked.

    Args:
        output_text: The generated text to validate.
        artifact_type: Label for logging (e.g., "long_form", "short_form").

    Returns:
        True if the output passes all checks.

    Raises:
        SecurityPolicyViolation: If a safety policy is violated.
    """
    logger.info(f"Running Output Security Guardrails on {artifact_type}...")

    if not output_text:
        return True

    for pattern in _SECRET_LEAKAGE_PATTERNS:
        if pattern.search(output_text):
            logger.error(f"Security Alert: Secret leakage in generated {artifact_type}.")
            raise SecurityPolicyViolation(
                f"Output rejected: generated {artifact_type} contains sensitive API credentials."
            )

    for pattern in _SYSTEM_PROMPT_LEAKAGE_PATTERNS:
        if pattern.search(output_text):
            logger.warning(
                f"Security Warning: Possible system prompt leakage detected in {artifact_type}."
            )
            # Warning only — doesn't block, since some phrases may appear legitimately.

    logger.info(f"Output ({artifact_type}) passed all security guardrails.")
    return True


def setup_policies(pipeline: "ContentPipeline") -> None:
    """
    Attach active security policy validators to the pipeline.

    Args:
        pipeline: ContentPipeline instance to attach guardrails to.
    """
    pipeline.add_guardrail("input", validate_input_safety)
    pipeline.add_guardrail("output", validate_output_safety)
    logger.info("Active security policies configured: Input sanitization and output screening enabled.")
