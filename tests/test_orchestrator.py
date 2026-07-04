"""
Tests for the ContentPipeline orchestrator.

Integration-style tests with mocked Gemini client to verify
the pipeline stages execute in order with proper error handling.
"""

import pytest
import os
from unittest.mock import AsyncMock, MagicMock, patch
from src.orchestrator import ContentPipeline, PipelineContext
from src.config import PipelineConfig
from src.agents.extractor import ExtractionSchema
from src.agents.validator import RevisionRequiredError


@pytest.fixture
def config(tmp_path):
    """Create a PipelineConfig pointing to temp directories."""
    return PipelineConfig(
        model="test-model",
        output_dir=tmp_path / "output",
        audit_log_dir=tmp_path / "audit_logs",
        skills_dir=tmp_path / "skills",
    )


@pytest.fixture
def mock_extraction():
    return ExtractionSchema(
        core_arguments=["Multi-agent systems are better"],
        supporting_evidence=["Context rot after 40k tokens"],
        knowledge_gaps=["MCP protocol details"],
    )


class TestContentPipelineInit:
    """Tests for ContentPipeline initialization."""

    @patch("src.orchestrator.genai.Client")
    def test_pipeline_creates_client(self, mock_genai_client, config):
        pipeline = ContentPipeline(config)
        mock_genai_client.assert_called_once()
        assert pipeline.model == "test-model"

    @patch("src.orchestrator.genai.Client")
    def test_guardrail_registration(self, mock_genai_client, config):
        pipeline = ContentPipeline(config)
        mock_fn = MagicMock()
        pipeline.add_guardrail("input", mock_fn)
        assert pipeline._input_guardrail is mock_fn

    @patch("src.orchestrator.genai.Client")
    def test_observer_registration(self, mock_genai_client, config):
        pipeline = ContentPipeline(config)
        mock_observer = MagicMock()
        pipeline.add_observer(mock_observer)
        assert pipeline.observer is mock_observer


class TestContentPipelineRun:
    """Tests for the full pipeline run."""

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    @patch("src.orchestrator.research_gaps")
    @patch("src.orchestrator.draft_long_form")
    @patch("src.orchestrator.draft_short_form")
    @patch("src.orchestrator.validate_content")
    async def test_successful_pipeline_run(
        self,
        mock_validate, mock_short, mock_long,
        mock_research, mock_extract, mock_genai,
        config, mock_extraction,
    ):
        """Test a full successful pipeline run with all stages."""
        mock_extract.return_value = mock_extraction
        mock_research.return_value = "/tmp/research.md"
        mock_long.return_value = "# Long Form Blog Post\n\nContent here..."
        mock_short.return_value = "Tired of context rot? Try multi-agent!"
        mock_validate.return_value = True

        pipeline = ContentPipeline(config)
        result = await pipeline.run("Test input about multi-agent systems")

        assert isinstance(result, PipelineContext)
        assert result.extraction == mock_extraction
        assert result.long_form_draft == "# Long Form Blog Post\n\nContent here..."
        assert result.short_form_draft == "Tired of context rot? Try multi-agent!"
        assert result.research_doc_path == "/tmp/research.md"

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    @patch("src.orchestrator.draft_long_form")
    @patch("src.orchestrator.draft_short_form")
    @patch("src.orchestrator.validate_content")
    async def test_skips_research_when_no_gaps(
        self,
        mock_validate, mock_short, mock_long,
        mock_extract, mock_genai,
        config,
    ):
        """Pipeline should skip research when no knowledge gaps exist."""
        no_gaps = ExtractionSchema(
            core_arguments=["arg"],
            supporting_evidence=["ev"],
            knowledge_gaps=[],
        )
        mock_extract.return_value = no_gaps
        mock_long.return_value = "Blog post"
        mock_short.return_value = "Hook"
        mock_validate.return_value = True

        pipeline = ContentPipeline(config)
        result = await pipeline.run("Simple input")

        assert result.research_doc_path is None

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    async def test_extraction_failure_propagates(
        self, mock_extract, mock_genai, config,
    ):
        """Extraction failure should propagate to caller."""
        mock_extract.side_effect = RuntimeError("Extraction failed")

        pipeline = ContentPipeline(config)
        with pytest.raises(RuntimeError, match="Extraction failed"):
            await pipeline.run("Test input")

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    async def test_input_guardrail_blocks_execution(
        self, mock_extract, mock_genai, config,
    ):
        """Input guardrail rejection should halt the pipeline."""
        pipeline = ContentPipeline(config)

        def blocking_guardrail(text):
            raise ValueError("Blocked by guardrail")

        pipeline.add_guardrail("input", blocking_guardrail)

        with pytest.raises(ValueError, match="Blocked by guardrail"):
            await pipeline.run("Blocked input")

        # Extraction should never have been called
        mock_extract.assert_not_called()

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    @patch("src.orchestrator.research_gaps")
    @patch("src.orchestrator.draft_long_form")
    @patch("src.orchestrator.draft_short_form")
    @patch("src.orchestrator.validate_content")
    async def test_observer_receives_all_lifecycle_events(
        self,
        mock_validate, mock_short, mock_long,
        mock_research, mock_extract, mock_genai,
        config, mock_extraction,
    ):
        """Observer should receive start, step, and complete notifications."""
        mock_extract.return_value = mock_extraction
        mock_research.return_value = "/tmp/research.md"
        mock_long.return_value = "Blog"
        mock_short.return_value = "Hook"
        mock_validate.return_value = True

        mock_observer = MagicMock()
        pipeline = ContentPipeline(config)
        pipeline.add_observer(mock_observer)

        await pipeline.run("Test input")

        mock_observer.on_pipeline_start.assert_called_once_with("Test input")
        mock_observer.on_pipeline_complete.assert_called_once()

        # Should have received step notifications for each agent
        step_calls = mock_observer.on_agent_step.call_args_list
        agent_names = [call.args[0] for call in step_calls]
        assert "Extractor" in agent_names
        assert "Researcher" in agent_names
        assert "Drafters" in agent_names
        assert "Validator" in agent_names


class TestValidationLoop:
    """Tests for the QA validation retry loop."""

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    @patch("src.orchestrator.research_gaps")
    @patch("src.orchestrator.draft_long_form")
    @patch("src.orchestrator.draft_short_form")
    @patch("src.orchestrator.validate_content")
    async def test_validation_retry_on_rejection(
        self,
        mock_validate, mock_short, mock_long,
        mock_research, mock_extract, mock_genai,
        config, mock_extraction,
    ):
        """Validator rejection should trigger re-drafting."""
        mock_extract.return_value = mock_extraction
        mock_research.return_value = "/tmp/research.md"
        mock_long.return_value = "Blog"
        mock_short.side_effect = ["Bad hook", "Good hook"]

        # First validation fails, second passes
        mock_validate.side_effect = [
            RevisionRequiredError("Missing call to action"),
            True,
        ]

        pipeline = ContentPipeline(config)
        result = await pipeline.run("Test input")

        # Short-form drafter should have been called twice (initial + revision)
        # (once in fan-out, once in validation loop)
        assert mock_short.call_count == 2

    @pytest.mark.asyncio
    @patch("src.orchestrator.genai.Client")
    @patch("src.orchestrator.extract_context")
    @patch("src.orchestrator.research_gaps")
    @patch("src.orchestrator.draft_long_form")
    @patch("src.orchestrator.draft_short_form")
    @patch("src.orchestrator.validate_content")
    async def test_max_revisions_emits_suboptimal(
        self,
        mock_validate, mock_short, mock_long,
        mock_research, mock_extract, mock_genai,
        config, mock_extraction,
    ):
        """After max revisions, pipeline should emit sub-optimal content."""
        config.max_revisions = 2
        mock_extract.return_value = mock_extraction
        mock_research.return_value = "/tmp/research.md"
        mock_long.return_value = "Blog"
        mock_short.return_value = "Hook"
        mock_validate.side_effect = RevisionRequiredError("Always fails")

        pipeline = ContentPipeline(config)
        result = await pipeline.run("Test input")

        # Pipeline should still return a result (sub-optimal)
        assert result.short_form_draft is not None
        assert mock_validate.call_count == 2
