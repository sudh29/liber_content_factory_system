"""
Storage API utilities.

Handles file-based persistence for legacy quotes DB and other JSON data.
"""

import json
import logging
from pathlib import Path

from liber_content_factory.config.constants import QUOTES_DB_FILE, HISTORY_FILE
from liber_content_factory.repositories.storage_repo import get_storage_repository

logger = logging.getLogger(__name__)


def read_json_file(filepath: Path) -> list:
    """Reads a JSON file returning a list of items, delegating to StorageRepository when applicable."""
    try:
        repo = get_storage_repository()
        if filepath == QUOTES_DB_FILE or str(filepath).endswith("quotes_db.json"):
            return repo.load_quotes()
        elif filepath == HISTORY_FILE or str(filepath).endswith("published_history.json"):
            return repo.load_history()

        # Fallback generic JSON file reader
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        return []
    except Exception as e:
        logger.error(f"Error reading {filepath}: {e}")
        return []


def write_json_file(filepath: Path, data: list) -> bool:
    """Writes a list of items to a JSON file, delegating to StorageRepository when applicable."""
    try:
        repo = get_storage_repository()
        if filepath == QUOTES_DB_FILE or str(filepath).endswith("quotes_db.json"):
            return repo.save_quotes(data)
        elif filepath == HISTORY_FILE or str(filepath).endswith("published_history.json"):
            return repo.save_history(data)

        # Fallback generic JSON file writer with atomic temp file replacement
        filepath.parent.mkdir(parents=True, exist_ok=True)
        temp_path = filepath.with_suffix(".tmp")
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        temp_path.replace(filepath)
        return True
    except Exception as e:
        logger.error(f"Error writing {filepath}: {e}")
        return False
