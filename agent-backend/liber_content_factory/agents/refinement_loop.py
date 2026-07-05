"""
Refinement Loop — Generate-Validate Iteration.

Combines the Generator, Validator, and EscalationChecker into a LoopAgent
that iterates up to 3 times until the draft passes validation.
"""

from typing import AsyncGenerator

from google.adk.agents import BaseAgent, LoopAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions

from liber_content_factory.agents.generator import generator_agent
from liber_content_factory.agents.validator import validator_agent


class EscalationChecker(BaseAgent):
    """Breaks the refinement loop when validation passes."""

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        passed = ctx.session.state.get("validation_passed", False)
        if passed:
            yield Event(author=self.name, actions=EventActions(escalate=True))
        else:
            yield Event(author=self.name)


refinement_loop = LoopAgent(
    name="refinement_loop",
    sub_agents=[generator_agent, validator_agent, EscalationChecker(name="escalation_checker")],
    max_iterations=3
)
