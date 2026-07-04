"""
Content Factory Orchestrator — manages the multi-agent pipeline.

Coordinates extraction → research → drafting (fan-out) → validation
with typed observer hooks and guardrail injection points.
"""

import asyncio
from dataclasses import dataclass
from typing import Optional, Callable, Protocol
import logging

from google import genai

from src.agents.extractor import extract_context, ExtractionSchema
from src.agents.researcher import research_gaps
from src.agents.drafters import draft_long_form, draft_short_form
from src.agents.validator import validate_content, RevisionRequiredError
from src.config import PipelineConfig

logger = logging.getLogger(__name__)


# --- Typed protocols for clean dependency injection ---


class PipelineObserverProtocol(Protocol):
    """Observer protocol for pipeline lifecycle events."""

    def on_pipeline_start(self, raw_input: str) -> None: ...
    def on_agent_step(self, agent_name: str, status: str, details: Optional[dict] = None) -> None: ...
    def on_pipeline_complete(self, context: "PipelineContext", success: bool, error_msg: Optional[str] = None) -> None: ...


InputGuardrailFn = Callable[[str], bool]
OutputGuardrailFn = Callable[[str, str], bool]


# --- Data container for pipeline state ---


@dataclass
class PipelineContext:
    """Holds the evolving state of a single pipeline run."""
    raw_input: str
    extraction: Optional[ExtractionSchema] = None
    research_doc_path: Optional[str] = None
    long_form_draft: Optional[str] = None
    short_form_draft: Optional[str] = None


# --- Main pipeline class ---


class ContentPipeline:
    """
    Orchestrates the multi-agent content generation pipeline.

    Replaces the previous closure-based orchestrator with a proper class
    that holds configuration, observer, and guardrails as typed fields
    instead of monkey-patched function attributes.
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.client = genai.Client()
        self.model = config.model

        # Typed optional hooks — no more hasattr checks
        self.observer: Optional[PipelineObserverProtocol] = None
        self._input_guardrail: Optional[InputGuardrailFn] = None
        self._output_guardrail: Optional[OutputGuardrailFn] = None

        logger.info(f"ContentPipeline initialized with model={self.model}")

    # --- Guardrail & observer registration ---

    def add_guardrail(self, policy_type: str, validator_fn: Callable) -> None:
        """Register an input or output guardrail function."""
        if policy_type == "input":
            self._input_guardrail = validator_fn
        elif policy_type == "output":
            self._output_guardrail = validator_fn
        else:
            logger.warning(f"Unknown guardrail type: {policy_type}")

    def add_observer(self, observer: PipelineObserverProtocol) -> None:
        """Register a lifecycle observer."""
        self.observer = observer

    # --- Private helpers to reduce observer boilerplate ---

    def _notify_start(self, raw_input: str) -> None:
        if self.observer:
            self.observer.on_pipeline_start(raw_input)

    def _notify_step(self, agent: str, status: str, details: Optional[dict] = None) -> None:
        if self.observer:
            self.observer.on_agent_step(agent, status, details)

    def _notify_complete(self, context: PipelineContext, success: bool, error_msg: Optional[str] = None) -> None:
        if self.observer:
            self.observer.on_pipeline_complete(context, success, error_msg)

    # --- Pipeline execution ---

    async def run(self, raw_input: str) -> PipelineContext:
        """
        Execute the full content generation pipeline.

        Steps:
          0. Input guardrail check
          1. Context extraction
          2. Research (if knowledge gaps found)
          3. Fan-out drafting (long-form + short-form concurrently)
          4. QA validation loop with revision feedback
          5. Output guardrail check

        Returns:
            PipelineContext with all generated artifacts.
        """
        logger.info("Pipeline starting...")
        context = PipelineContext(raw_input=raw_input)
        self._notify_start(raw_input)

        try:
            # 0. Input guardrail
            if self._input_guardrail:
                self._input_guardrail(raw_input)

            # 1. Extraction
            context.extraction = await self._run_extraction(context)

            # 2. Research
            context.research_doc_path = await self._run_research(context)

            # 3. Fan-out drafting
            context.long_form_draft, context.short_form_draft = await self._run_drafters(context)

            # 4. QA validation loop
            context.short_form_draft = await self._run_validation(context)

            # 5. Output guardrail
            if self._output_guardrail:
                self._output_guardrail(context.long_form_draft, "long_form")
                self._output_guardrail(context.short_form_draft, "short_form")

            logger.info("Pipeline complete. Returning context artifact.")
            self._notify_complete(context, success=True)
            return context

        except Exception as e:
            logger.error(f"Pipeline execution terminated: {e}")
            self._notify_complete(context, success=False, error_msg=str(e))
            raise

    # --- Individual stage methods ---

    async def _run_extraction(self, context: PipelineContext) -> ExtractionSchema:
        """Stage 1: Extract structured context from raw input."""
        logger.info("Spawning Context & Extraction Agent...")
        self._notify_step("Extractor", "STARTED")

        extraction = await extract_context(self.client, self.model, context.raw_input)
        self._notify_step("Extractor", "COMPLETED", {"gaps_found": len(extraction.knowledge_gaps)})
        return extraction

    async def _run_research(self, context: PipelineContext) -> Optional[str]:
        """Stage 2: Research knowledge gaps if any were identified."""
        if not context.extraction or not context.extraction.knowledge_gaps:
            logger.info("No knowledge gaps identified. Skipping research phase.")
            self._notify_step("Researcher", "SKIPPED")
            return None

        logger.info("Spawning Research & Fact-Checker Agent...")
        self._notify_step("Researcher", "STARTED", {"gaps": context.extraction.knowledge_gaps})

        doc_path = await research_gaps(
            self.client, self.model,
            context.extraction.knowledge_gaps,
            output_dir=str(self.config.output_dir),
        )
        self._notify_step("Researcher", "COMPLETED", {"doc_path": doc_path})
        return doc_path

    async def _run_drafters(self, context: PipelineContext) -> tuple[str, str]:
        """Stage 3: Fan-out to long-form and short-form drafters concurrently."""
        logger.info("Executing fan-out to Long-Form and Short-Form Agents...")
        self._notify_step("Drafters", "STARTED_FANOUT")

        results = await asyncio.gather(
            draft_long_form(self.client, self.model, context.extraction, context.research_doc_path),
            draft_short_form(
                self.client, self.model, context.extraction,
                skills_dir=str(self.config.skills_dir),
            ),
            return_exceptions=True,
        )

        for res in results:
            if isinstance(res, Exception):
                logger.error(f"A drafting agent failed: {res}")
                raise res

        self._notify_step("Drafters", "COMPLETED_FANOUT")
        return results[0], results[1]

    async def _run_validation(self, context: PipelineContext) -> str:
        """Stage 4: QA validation loop with revision feedback."""
        logger.info("Awakening QA Validator...")
        short_form = context.short_form_draft

        for attempt in range(1, self.config.max_revisions + 1):
            try:
                self._notify_step("Validator", f"VALIDATING_ATTEMPT_{attempt}")
                await validate_content(self.client, self.model, context)
                logger.info("Validation passed!")
                self._notify_step("Validator", "PASSED")
                return short_form
            except RevisionRequiredError as e:
                logger.warning(f"Validation failed (attempt {attempt}/{self.config.max_revisions}): {e}")
                self._notify_step("Validator", f"REJECTED_ATTEMPT_{attempt}", {"reason": str(e)})

                if attempt >= self.config.max_revisions:
                    logger.error("Max revisions reached. Emitting sub-optimal package.")
                    return short_form

                logger.info("Re-running Short-Form drafter based on feedback...")
                short_form = await draft_short_form(
                    self.client, self.model, context.extraction,
                    feedback=str(e),
                    skills_dir=str(self.config.skills_dir),
                )
                context.short_form_draft = short_form

        return short_form
