"""
Content Factory Orchestrator — manages the generic multi-agent pipeline.

Coordinates planning, research, duplicate detection, ranking, generation,
validation, formatting, media generation, and publishing dynamically based
on the injected ContentStrategy.
"""

import asyncio
from typing import Optional, Callable, Protocol
import logging

from google import genai

from src.core.models import PipelineContext
from src.core.strategy import ContentStrategy
from src.config import PipelineConfig

from src.agents.planner import discover_content
from src.agents.duplicate_detector import filter_duplicates
from src.agents.ranker import rank_candidates
from src.agents.researcher import research_topic
from src.agents.generator import generate_draft
from src.agents.validator import validate_draft, RevisionRequiredError
from src.agents.formatter import format_content
from src.agents.media_generator import generate_media
from src.agents.publisher import publish_content

logger = logging.getLogger(__name__)


class PipelineObserverProtocol(Protocol):
    """Observer protocol for pipeline lifecycle events."""
    def on_pipeline_start(self, raw_input: str) -> None: ...
    def on_agent_step(self, agent_name: str, status: str, details: Optional[dict] = None) -> None: ...
    def on_pipeline_complete(self, context: PipelineContext, success: bool, error_msg: Optional[str] = None) -> None: ...


InputGuardrailFn = Callable[[str], bool]
OutputGuardrailFn = Callable[[str, str], bool]


class ContentPipeline:
    """
    Orchestrates the multi-agent content generation pipeline.
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.client = genai.Client()
        self.model = config.model

        self.observer: Optional[PipelineObserverProtocol] = None
        self._input_guardrail: Optional[InputGuardrailFn] = None
        self._output_guardrail: Optional[OutputGuardrailFn] = None

        logger.info(f"ContentPipeline initialized with model={self.model}")

    def add_guardrail(self, policy_type: str, validator_fn: Callable) -> None:
        if policy_type == "input":
            self._input_guardrail = validator_fn
        elif policy_type == "output":
            self._output_guardrail = validator_fn
        else:
            logger.warning(f"Unknown guardrail type: {policy_type}")

    def add_observer(self, observer: PipelineObserverProtocol) -> None:
        self.observer = observer

    def _notify_start(self, raw_input: str) -> None:
        if self.observer:
            self.observer.on_pipeline_start(raw_input)

    def _notify_step(self, agent: str, status: str, details: Optional[dict] = None) -> None:
        if self.observer:
            self.observer.on_agent_step(agent, status, details)

    def _notify_complete(self, context: PipelineContext, success: bool, error_msg: Optional[str] = None) -> None:
        if self.observer:
            self.observer.on_pipeline_complete(context, success, error_msg)


    async def run(self, raw_input: str, strategy: ContentStrategy) -> PipelineContext:
        """
        Execute the generic content generation pipeline using a strategy plugin.
        """
        logger.info(f"Pipeline starting with strategy: {strategy.name}...")
        context = PipelineContext(raw_input=raw_input)
        self._notify_start(raw_input)

        try:
            # 0. Input guardrail
            if self._input_guardrail:
                self._input_guardrail(raw_input)

            # 1. Planner / Discovery
            self._notify_step("Planner", "STARTED")
            context = await discover_content(self.client, self.model, context, strategy)
            self._notify_step("Planner", "COMPLETED", {"items_found": len(context.candidate_items)})

            # 2. Duplicate Detection
            self._notify_step("DuplicateDetector", "STARTED")
            context = await filter_duplicates(context)
            self._notify_step("DuplicateDetector", "COMPLETED", {"remaining_items": len(context.candidate_items)})

            if not context.candidate_items:
                raise ValueError("No candidate items remaining after duplicate detection.")

            # 3. Ranking
            self._notify_step("Ranker", "STARTED")
            context = await rank_candidates(self.client, self.model, context, strategy)
            self._notify_step("Ranker", "COMPLETED", {"selected": context.selected_item.raw_content[:50]})

            # 4. Research
            self._notify_step("Researcher", "STARTED")
            context = await research_topic(self.client, self.model, context)
            self._notify_step("Researcher", "COMPLETED")

            # 5. Generation
            self._notify_step("Generator", "STARTED")
            context = await generate_draft(self.client, self.model, context, strategy)
            self._notify_step("Generator", "COMPLETED")

            # 6. Validation (QA loop)
            self._notify_step("Validator", "STARTED")
            valid = False
            for attempt in range(1, self.config.max_revisions + 1):
                try:
                    context = await validate_draft(self.client, self.model, context, strategy)
                    valid = True
                    break
                except RevisionRequiredError as e:
                    logger.warning(f"Validation failed (attempt {attempt}/{self.config.max_revisions}): {e}")
                    if attempt < self.config.max_revisions:
                        logger.info("Re-running Generator based on feedback...")
                        context = await generate_draft(self.client, self.model, context, strategy, feedback=str(e))
            self._notify_step("Validator", "COMPLETED", {"passed": valid})

            # 7. Formatting
            self._notify_step("Formatter", "STARTED")
            context = await format_content(self.client, self.model, context, strategy)
            self._notify_step("Formatter", "COMPLETED", {"platforms": list(context.formatted_content.keys())})

            # 8. Output Guardrails
            if self._output_guardrail:
                for platform, content in context.formatted_content.items():
                    self._output_guardrail(content, platform)

            # 9. Media Generation
            self._notify_step("MediaGenerator", "STARTED")
            context = await generate_media(self.client, self.model, context, strategy)
            self._notify_step("MediaGenerator", "COMPLETED")

            # 10. Publishing
            self._notify_step("Publisher", "STARTED")
            context = await publish_content(context)
            self._notify_step("Publisher", "COMPLETED", {"urls": context.published_urls})

            logger.info("Pipeline complete. Returning context artifact.")
            self._notify_complete(context, success=True)
            return context

        except Exception as e:
            logger.error(f"Pipeline execution terminated: {e}")
            self._notify_complete(context, success=False, error_msg=str(e))
            raise
