"""
Tests for the extractor agent module.

Covers ExtractionSchema validation, retry logic behavior,
and edge cases.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.agents.extractor import extract_context, ExtractionSchema


class TestExtractionSchema:
    """Tests for the ExtractionSchema Pydantic model."""

    def test_valid_schema(self):
        schema = ExtractionSchema(
            core_arguments=["AI agents are better than single LLMs"],
            supporting_evidence=["Context rot after 40k tokens"],
            knowledge_gaps=["MCP protocol details"],
        )
        assert len(schema.core_arguments) == 1
        assert len(schema.supporting_evidence) == 1
        assert len(schema.knowledge_gaps) == 1

    def test_empty_core_arguments_invalid(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ExtractionSchema(
                core_arguments=[],
                supporting_evidence=[],
                knowledge_gaps=[],
            )

    def test_json_round_trip(self):
        original = ExtractionSchema(
            core_arguments=["arg1", "arg2"],
            supporting_evidence=["ev1"],
            knowledge_gaps=["gap1"],
        )
        json_str = original.model_dump_json()
        restored = ExtractionSchema.model_validate_json(json_str)
        assert restored == original


class TestExtractContext:
    """Tests for the extract_context function."""

    @pytest.mark.asyncio
    async def test_successful_extraction_via_parsed(self):
        """Test extraction when response.parsed is available."""
        expected = ExtractionSchema(
            core_arguments=["Multi-agent systems are better"],
            supporting_evidence=["Context rot evidence"],
            knowledge_gaps=["MCP details"],
        )

        mock_response = MagicMock()
        mock_response.parsed = expected

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        result = await extract_context(mock_client, "gemini-2.5-pro", "test input")
        assert result == expected

    @pytest.mark.asyncio
    async def test_successful_extraction_via_text_fallback(self):
        """Test extraction when response.parsed is None, falls back to text parsing."""
        expected = ExtractionSchema(
            core_arguments=["argument"],
            supporting_evidence=["evidence"],
            knowledge_gaps=[],
        )

        mock_response = MagicMock()
        mock_response.parsed = None
        mock_response.text = expected.model_dump_json()

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        result = await extract_context(mock_client, "gemini-2.5-pro", "test input")
        assert result == expected

    @pytest.mark.asyncio
    async def test_retries_on_failure_then_succeeds(self):
        """Test that transient failures are retried."""
        expected = ExtractionSchema(
            core_arguments=["arg"],
            supporting_evidence=[],
            knowledge_gaps=[],
        )

        mock_response = MagicMock()
        mock_response.parsed = expected

        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(
            side_effect=[ValueError("parse error"), mock_response]
        )

        result = await extract_context(mock_client, "gemini-2.5-pro", "test input")
        assert result == expected
        assert mock_client.aio.models.generate_content.call_count == 2

    @pytest.mark.asyncio
    async def test_raises_after_all_retries_exhausted(self):
        """Test that RuntimeError is raised when all retries fail."""
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(
            side_effect=ValueError("persistent error")
        )

        with pytest.raises(RuntimeError, match="failed after 2 attempts"):
            await extract_context(mock_client, "gemini-2.5-pro", "test input")

        assert mock_client.aio.models.generate_content.call_count == 2
