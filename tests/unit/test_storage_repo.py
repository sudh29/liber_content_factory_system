"""
Unit tests for Storage Repository implementations.
"""

import os
from pathlib import Path
import pytest

from liber_content_factory.repositories.storage_repo import (
    FileStorageRepository,
    SQLStorageRepository,
    get_storage_repository,
    reset_storage_repository,
)


def test_file_storage_repository(tmp_path: Path):
    quotes_file = tmp_path / "quotes.json"
    history_file = tmp_path / "history.json"

    repo = FileStorageRepository(quotes_file=quotes_file, history_file=history_file)

    # Test saving and loading quotes
    sample_quotes = [{"id": "1", "text": "Test quote", "author": "Tester"}]
    assert repo.save_quotes(sample_quotes) is True
    loaded_quotes = repo.load_quotes()
    assert len(loaded_quotes) == 1
    assert loaded_quotes[0]["text"] == "Test quote"

    # Test saving and loading history
    sample_history = [{"hash": "abc", "raw_content": "Historical content"}]
    assert repo.save_history(sample_history) is True
    loaded_history = repo.load_history()
    assert len(loaded_history) == 1
    assert loaded_history[0]["raw_content"] == "Historical content"


def test_sql_storage_repository(tmp_path: Path):
    db_file = tmp_path / "test_storage.db"
    db_url = f"sqlite:///{db_file}"

    repo = SQLStorageRepository(db_url=db_url)

    sample_quotes = [
        {"id": "quote_1", "text": "SQL Quote 1", "author": "SQL Author"},
        {"id": "quote_2", "text": "SQL Quote 2", "author": "SQL Author"},
    ]
    assert repo.save_quotes(sample_quotes) is True
    loaded_quotes = repo.load_quotes()
    assert len(loaded_quotes) == 2
    assert {q["id"] for q in loaded_quotes} == {"quote_1", "quote_2"}

    # Test persistence with a new repo instance
    repo2 = SQLStorageRepository(db_url=db_url)
    assert len(repo2.load_quotes()) == 2


def test_get_storage_repository(monkeypatch, tmp_path: Path):
    reset_storage_repository()
    
    # By default without DATABASE_URL, should return FileStorageRepository
    monkeypatch.delenv("DATABASE_URL", raising=False)
    repo = get_storage_repository()
    assert isinstance(repo, FileStorageRepository)

    # When DATABASE_URL is set, should return SQLStorageRepository
    reset_storage_repository()
    db_file = tmp_path / "factory.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")
    repo_sql = get_storage_repository()
    assert isinstance(repo_sql, SQLStorageRepository)
    reset_storage_repository()
