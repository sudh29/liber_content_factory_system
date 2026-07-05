"""
Storage API utilities.

Handles file-based persistence for legacy quotes DB and other JSON data.
"""

import json
import logging
from pathlib import Path

# The legacy quote database path
QUOTES_DB_FILE = Path(__file__).resolve().parent.parent.parent.parent / "quotes_db.json"

logger = logging.getLogger(__name__)


def read_json_file(filepath: Path) -> list:
    """Reads a JSON file returning a list of items."""
    try:
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        logger.error(f"Error reading {filepath}: {e}")
        return []


def write_json_file(filepath: Path, data: list) -> bool:
    """Writes a list of items to a JSON file."""
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error writing {filepath}: {e}")
        return False
