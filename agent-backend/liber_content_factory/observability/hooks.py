"""
Pipeline Hooks for Observability.

ADK callbacks that track state transitions during the pipeline execution.
"""

import logging
from google.adk.agents.callback_context import CallbackContext

logger = logging.getLogger(__name__)


class PipelineObserver:
    """Observes and logs pipeline state transitions."""

    @staticmethod
    async def before_pipeline_run(ctx: CallbackContext) -> None:
        logger.info(f"Pipeline Run Started. Initial State: {ctx.state}")

    @staticmethod
    async def after_pipeline_run(ctx: CallbackContext) -> None:
        logger.info(f"Pipeline Run Completed. Final State: {ctx.state}")

    @staticmethod
    async def before_agent_step(agent_name: str, ctx: CallbackContext) -> None:
        logger.debug(f"Agent '{agent_name}' starting. State: {ctx.state}")

    @staticmethod
    async def after_agent_step(agent_name: str, ctx: CallbackContext) -> None:
        logger.debug(f"Agent '{agent_name}' finished. State updated.")
