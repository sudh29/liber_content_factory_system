"""
Storage Repository implementations.

Provides abstract and concrete repositories for persisting quotes and publishing history.
Supports file-based atomic JSON storage and SQL relational database storage.
"""

import json
import logging
import sqlite3
import shutil
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from liber_content_factory.config.constants import PROJECT_ROOT, DATA_DIR, QUOTES_DB_FILE, HISTORY_FILE

logger = logging.getLogger(__name__)


class StorageRepository(ABC):
    """Abstract base class for storage repositories."""

    @abstractmethod
    def load_quotes(self, file_override: Path | None = None) -> list[dict]:
        """Load all quote items from storage."""
        pass

    @abstractmethod
    def save_quotes(self, quotes: list[dict], file_override: Path | None = None) -> bool:
        """Save quote items to storage."""
        pass

    @abstractmethod
    def load_history(self, file_override: Path | None = None) -> list[dict]:
        """Load publishing history from storage."""
        pass

    @abstractmethod
    def save_history(self, history: list[dict], file_override: Path | None = None) -> bool:
        """Save publishing history to storage."""
        pass


class FileStorageRepository(StorageRepository):
    """File-based persistence using atomic JSON file writing."""

    def __init__(self, quotes_file: Path = QUOTES_DB_FILE, history_file: Path = HISTORY_FILE):
        self.quotes_file = quotes_file
        self.history_file = history_file
        self._ensure_data_dir()
        self._migrate_legacy_quotes()

    def _ensure_data_dir(self):
        """Ensure the parent directory for data files exists."""
        self.quotes_file.parent.mkdir(parents=True, exist_ok=True)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)

    def _migrate_legacy_quotes(self):
        """Migrate legacy quotes_db.json from repository root if present and new DB doesn't exist."""
        legacy_file = PROJECT_ROOT.parent / "quotes_db.json"
        if not self.quotes_file.exists() and legacy_file.exists():
            try:
                logger.info(f"Migrating legacy quote database from {legacy_file} to {self.quotes_file}...")
                shutil.copy2(legacy_file, self.quotes_file)
            except Exception as e:
                logger.error(f"Failed to migrate legacy quotes DB: {e}")

    def _read_json(self, filepath: Path) -> list[dict]:
        try:
            if filepath.exists():
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data if isinstance(data, list) else []
            return []
        except Exception as e:
            logger.error(f"Error reading JSON from {filepath}: {e}")
            return []

    def _write_json(self, filepath: Path, data: list[dict]) -> bool:
        """Atomic write to prevent corruption during concurrent operations or crashes."""
        try:
            filepath.parent.mkdir(parents=True, exist_ok=True)
            temp_path = filepath.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            temp_path.replace(filepath)
            return True
        except Exception as e:
            logger.error(f"Error writing JSON to {filepath}: {e}")
            return False

    def load_quotes(self, file_override: Path | None = None) -> list[dict]:
        return self._read_json(file_override or self.quotes_file)

    def save_quotes(self, quotes: list[dict], file_override: Path | None = None) -> bool:
        return self._write_json(file_override or self.quotes_file, quotes)

    def load_history(self, file_override: Path | None = None) -> list[dict]:
        return self._read_json(file_override or self.history_file)

    def save_history(self, history: list[dict], file_override: Path | None = None) -> bool:
        return self._write_json(file_override or self.history_file, history)


class SQLStorageRepository(StorageRepository):
    """Relational SQL persistence supporting SQLite / PostgreSQL schema."""

    def __init__(self, db_url: str):
        self.db_url = db_url
        if db_url.startswith("sqlite:///"):
            sqlite_path_str = db_url[10:]
            if sqlite_path_str.startswith("/"):
                self.db_path = Path(sqlite_path_str)
            else:
                self.db_path = PROJECT_ROOT / sqlite_path_str
        else:
            # Fallback default sqlite path if generic string provided
            self.db_path = DATA_DIR / "content_factory.db"
        
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def _init_schema(self):
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS quotes (
                        id TEXT PRIMARY KEY,
                        item_json TEXT NOT NULL
                    )
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS publish_history (
                        id TEXT PRIMARY KEY,
                        item_json TEXT NOT NULL
                    )
                """)
        except Exception as e:
            logger.error(f"Error initializing SQL schema: {e}")

    def _load_table(self, table_name: str) -> list[dict]:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"SELECT item_json FROM {table_name}")
                rows = cursor.fetchall()
                results = []
                for (item_str,) in rows:
                    try:
                        results.append(json.loads(item_str))
                    except json.JSONDecodeError:
                        continue
                return results
        except Exception as e:
            logger.error(f"Error loading from table {table_name}: {e}")
            return []

    def _save_table(self, table_name: str, items: list[dict]) -> bool:
        try:
            with self._get_connection() as conn:
                conn.execute("BEGIN TRANSACTION")
                conn.execute(f"DELETE FROM {table_name}")
                for i, item in enumerate(items):
                    item_id = str(item.get("id") or item.get("hash") or f"row_{i}")
                    item_str = json.dumps(item, ensure_ascii=False)
                    conn.execute(
                        f"INSERT INTO {table_name} (id, item_json) VALUES (?, ?)",
                        (item_id, item_str)
                    )
            return True
        except Exception as e:
            logger.error(f"Error saving to table {table_name}: {e}")
            return False

    def load_quotes(self, file_override: Path | None = None) -> list[dict]:
        return self._load_table("quotes")

    def save_quotes(self, quotes: list[dict], file_override: Path | None = None) -> bool:
        return self._save_table("quotes", quotes)

    def load_history(self, file_override: Path | None = None) -> list[dict]:
        return self._load_table("publish_history")

    def save_history(self, history: list[dict], file_override: Path | None = None) -> bool:
        return self._save_table("publish_history", history)


_repository_instance: StorageRepository | None = None

def get_storage_repository() -> StorageRepository:
    """Factory function to get the active storage repository instance based on configuration."""
    global _repository_instance
    if _repository_instance is None:
        db_url = os.environ.get("DATABASE_URL")
        if db_url:
            logger.info(f"Initializing SQLStorageRepository with URL: {db_url}")
            _repository_instance = SQLStorageRepository(db_url)
        else:
            logger.debug("Initializing FileStorageRepository (default)")
            _repository_instance = FileStorageRepository()
    return _repository_instance


def reset_storage_repository():
    """Reset repository instance (useful for unit testing and config changes)."""
    global _repository_instance
    _repository_instance = None
