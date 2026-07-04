"""
Pipeline lifecycle hooks — observability and audit trail.

Provides a PipelineObserver that tracks execution events, timing,
and writes structured JSON audit logs for compliance.
"""

import logging
import time
import json
import os
from datetime import datetime, timezone
from dataclasses import asdict, is_dataclass

logger = logging.getLogger(__name__)


class PipelineObserver:
    """
    Tracks lifecycle events, execution times, and state transitions
    of the Content Factory pipeline.

    Writes structured JSON audit trails for compliance and observability.
    """

    def __init__(self, log_dir: str = "audit_logs"):
        self.log_dir = log_dir
        self.start_time: float | None = None
        self.steps: list[dict] = []
        self.run_id = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        os.makedirs(self.log_dir, exist_ok=True)

    def on_pipeline_start(self, raw_input: str) -> None:
        self.start_time = time.time()
        self.steps = []
        logger.info(f"[{self.run_id}] Pipeline execution started.")
        self.steps.append({
            "step": "pipeline_start",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_input_preview": raw_input[:100] + "..." if len(raw_input) > 100 else raw_input
        })

    def on_agent_step(self, agent_name: str, status: str, details: dict = None) -> None:
        elapsed = time.time() - self.start_time if self.start_time else 0
        logger.info(f"[{self.run_id}] Agent '{agent_name}' -> {status} (t={elapsed:.2f}s)")
        step_record = {
            "step": agent_name,
            "status": status,
            "elapsed_seconds": round(elapsed, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if details:
            step_record["details"] = details
        self.steps.append(step_record)

    def on_pipeline_complete(self, context, success: bool, error_msg: str = None) -> str:
        total_time = time.time() - self.start_time if self.start_time else 0
        status_str = "SUCCESS" if success else "FAILED"
        logger.info(f"[{self.run_id}] Pipeline finished: {status_str} (Total: {total_time:.2f}s)")

        # Convert context dataclass to dict if possible
        context_dict = {}
        if context:
            if is_dataclass(context):
                context_dict = asdict(context)
            elif hasattr(context, "__dict__"):
                context_dict = context.__dict__
            else:
                context_dict = str(context)

        audit_payload = {
            "run_id": self.run_id,
            "status": status_str,
            "total_duration_seconds": round(total_time, 2),
            "timestamp_completed": datetime.now(timezone.utc).isoformat(),
            "error": error_msg,
            "execution_steps": self.steps,
            "final_context": context_dict,
        }

        log_path = os.path.join(self.log_dir, f"run_{self.run_id}.json")
        try:
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(audit_payload, f, indent=2, default=str)
            logger.info(f"Structured audit log saved to: {log_path}")
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")

        return log_path


def register_hooks(pipeline, log_dir: str = "audit_logs") -> None:
    """
    Register the PipelineObserver on the given pipeline instance.

    Args:
        pipeline: A ContentPipeline instance with an add_observer method.
        log_dir: Directory for structured JSON audit logs.
    """
    observer = PipelineObserver(log_dir=log_dir)
    pipeline.add_observer(observer)
    logger.info("Lifecycle hooks registered: PipelineObserver active with structured JSON audit logging.")
