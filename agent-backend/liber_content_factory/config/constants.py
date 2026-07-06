"""
Shared constants for the Content Factory.

Centralizes magic numbers, default values, and thresholds that were
previously scattered across multiple files.
"""

from pathlib import Path

# Project root (agent-backend directory)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# Output and Data paths
OUTPUT_DIR = PROJECT_ROOT / "output"
DATA_DIR = PROJECT_ROOT / "data"
AUDIT_LOG_DIR = PROJECT_ROOT / "audit_logs"
HISTORY_FILE = DATA_DIR / "published_history.json"
QUOTES_DB_FILE = DATA_DIR / "quotes_db.json"
MEDIA_OUTPUT_DIR = OUTPUT_DIR / "media"

# Duplicate detection
SIMILARITY_THRESHOLD = 0.85

# Agent rate-limit sleep (seconds) — applied before each agent call
AGENT_SLEEP_SECONDS = 5.0

# Refinement loop
MAX_REFINEMENT_ITERATIONS = 3

# Input validation
MAX_INPUT_LENGTH = 50_000
