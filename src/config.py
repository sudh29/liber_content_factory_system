"""
Centralized configuration for the Content Factory pipeline.

Loads settings from environment variables with sensible defaults.
Validates required configuration at startup to fail fast.
"""

import os
import logging
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

# Project root is the parent of the `src/` directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class PipelineConfig:
    """Configuration for the content generation pipeline."""

    # Gemini model to use for all agent calls
    model: str = "gemini-2.5-flash"

    # Output directory for research documents
    output_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "output")

    # Audit log directory
    audit_log_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "audit_logs")

    # Skills directory (agent skills definitions)
    skills_dir: Path = field(default_factory=lambda: PROJECT_ROOT / ".agents" / "skills")

    # Maximum revision attempts in the QA validation loop
    max_revisions: int = 3

    def __post_init__(self):
        """Ensure output directories exist."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.audit_log_dir.mkdir(parents=True, exist_ok=True)


def load_config() -> PipelineConfig:
    """
    Load pipeline configuration from environment variables.

    Raises:
        EnvironmentError: If required environment variables are missing.
    """
    # Validate required keys
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        raise EnvironmentError(
            "GEMINI_API_KEY environment variable is required. "
            "Set it in your shell or create a .env file (see .env.example)."
        )

    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    output_dir = Path(os.environ.get("OUTPUT_DIR", str(PROJECT_ROOT / "output")))
    audit_log_dir = Path(os.environ.get("AUDIT_LOG_DIR", str(PROJECT_ROOT / "audit_logs")))

    config = PipelineConfig(
        model=model,
        output_dir=output_dir,
        audit_log_dir=audit_log_dir,
    )

    logger.info(f"Configuration loaded: model={config.model}, output_dir={config.output_dir}")
    return config
