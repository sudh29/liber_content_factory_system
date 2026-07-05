import logging
import os
from typing import AsyncGenerator
from dotenv import load_dotenv

from google.adk.agents import Agent, SequentialAgent, ParallelAgent, LoopAgent, BaseAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.apps import App
from google.adk.events import Event, EventActions
from google.adk.models import Gemini
from google.adk.tools import google_search
from google.genai import types

from app.models import DiscoverySchema, ScoringSchema, EvaluationResult

load_dotenv()

logger = logging.getLogger(__name__)

# --- State Initialization Callback ---

async def init_pipeline_state(callback_context: CallbackContext) -> None:
    # If strategy_name is not in state, default to "quotes"
    strategy_name = callback_context.state.get("strategy_name", "quotes")
    
    # Import strategy plugins dynamically
    from src.plugins.quotes_strategy import DailyQuoteStrategy
    from src.plugins.generic_strategy import GenericContentStrategy
    
    if strategy_name == "quotes":
        strategy = DailyQuoteStrategy()
        callback_context.state["generation_prompt"] = (
            "Provide:\n1. A meaningful explanation of the quote.\n2. Practical life lessons.\n3. Suggested hashtags.\n4. Strong Call-To-Action (CTA)."
        )
    else:
        strategy = GenericContentStrategy(strategy_name)
        callback_context.state["generation_prompt"] = (
            f"Write content optimized for {strategy_name} and provide:\n1. Full optimized structure.\n2. At least 3 hashtags.\n3. A strong CTA."
        )
        
    callback_context.state["discovery_prompt"] = strategy.get_discovery_prompt(callback_context.state.get("temp:input_query", ""))
    callback_context.state["validation_prompt"] = strategy.get_validation_prompt()
    callback_context.state["ranking_criteria"] = strategy.get_ranking_criteria()
    
    rules = strategy.get_formatting_rules()
    callback_context.state["formatting_rules_twitter"] = rules.get("twitter", "")
    callback_context.state["formatting_rules_linkedin"] = rules.get("linkedin", "")
    callback_context.state["formatting_rules_instagram"] = rules.get("instagram", "")

# --- Agent Declarations ---

# 1. Planner
planner_agent = Agent(
    name="planner_agent",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""You are an expert Content Discovery Agent.
Generate 5 diverse candidate content ideas/themes.

Strategy Guidance:
{discovery_prompt}

Format the output strictly as JSON following the DiscoverySchema.""",
    output_schema=DiscoverySchema,
    output_key="temp:discovery_raw"
)

async def process_discovery(callback_context: CallbackContext) -> None:
    discovery_raw = callback_context.state.get("temp:discovery_raw")
    if discovery_raw:
        if isinstance(discovery_raw, dict):
            topic = discovery_raw.get("topic", "")
            items = discovery_raw.get("items", [])
        else:
            topic = discovery_raw.topic
            items = discovery_raw.items
        callback_context.state["topic"] = topic
        callback_context.state["candidate_items"] = [{"raw_content": item} for item in items]

planner_agent.after_agent_callback = process_discovery

# 2. Duplicate Detector
class DuplicateDetectorAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        from app.tools import filter_duplicates_tool
        from google.adk.tools import ToolContext
        tool_ctx = ToolContext(ctx)
        await filter_duplicates_tool(tool_ctx)
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "candidate_items": tool_ctx.state.get("candidate_items")
            })
        )

# 3. Ranker
ranker_agent = Agent(
    name="ranker_agent",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""Evaluate and score each of the candidate items on a scale from 0.0 to 10.0.

Criteria:
{ranking_criteria}

Candidates:
{candidates_text}""",
    output_schema=ScoringSchema,
    output_key="temp:scoring_raw"
)

async def prepare_ranker_input(callback_context: CallbackContext) -> None:
    candidates = callback_context.state.get("candidate_items", [])
    text = "\n".join([f"{i+1}. {c.get('raw_content')}" for i, c in enumerate(candidates)])
    callback_context.state["candidates_text"] = text

async def process_ranking(callback_context: CallbackContext) -> None:
    candidates = callback_context.state.get("candidate_items", [])
    if not candidates:
        return
    if len(candidates) == 1:
        candidates[0]["score"] = 10.0
        callback_context.state["selected_item"] = candidates[0]
        return

    scoring_raw = callback_context.state.get("temp:scoring_raw")
    scores = []
    if scoring_raw:
        if isinstance(scoring_raw, dict):
            scores = scoring_raw.get("scores", [])
        elif hasattr(scoring_raw, "scores"):
            scores = scoring_raw.scores
            
    if scores and len(scores) == len(candidates):
        for i, s in enumerate(scores):
            candidates[i]["score"] = s
    else:
        for c in candidates:
            c["score"] = 1.0
    
    candidates.sort(key=lambda x: x.get("score", 0.0), reverse=True)
    callback_context.state["candidate_items"] = candidates
    callback_context.state["selected_item"] = candidates[0]

ranker_agent.before_agent_callback = prepare_ranker_input
ranker_agent.after_agent_callback = process_ranking

# 4. Researcher
researcher_agent = Agent(
    name="researcher_agent",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""Conduct web research to find interesting facts, context, or background information related to: '{selected_raw_content}'. Summarize the findings concisely.""",
    tools=[google_search],
    output_key="research_data"
)

async def prepare_researcher_input(callback_context: CallbackContext) -> None:
    selected = callback_context.state.get("selected_item", {})
    callback_context.state["selected_raw_content"] = selected.get("raw_content", "")

researcher_agent.before_agent_callback = prepare_researcher_input

# 5. Generator
generator_agent = Agent(
    name="generator_agent",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""You are an expert AI Content Generator. Create the initial draft.

Strategy Guidance:
{generation_prompt}

Background Research/Context:
{research_data}

Candidate Content:
{selected_raw_content}
{revision_feedback_instruction}""",
    output_key="draft"
)

async def prepare_generator_input(callback_context: CallbackContext) -> None:
    feedback = callback_context.state.get("revision_feedback")
    if feedback:
        callback_context.state["revision_feedback_instruction"] = (
            f"\n\nPrevious draft was rejected with the following feedback. Please fix the issues and revise:\n{feedback}"
        )
    else:
        callback_context.state["revision_feedback_instruction"] = ""

generator_agent.before_agent_callback = prepare_generator_input

# 6. Validator
validator_agent = Agent(
    name="validator_agent",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""Evaluate the following draft.

Draft:
{draft}

Criteria:
{validation_prompt}

If it fails any of these criteria, mark passed as false and provide specific feedback.""",
    output_schema=EvaluationResult,
    output_key="temp:validation_raw"
)

async def process_validation(callback_context: CallbackContext) -> None:
    val_res = callback_context.state.get("temp:validation_raw")
    if val_res:
        if isinstance(val_res, dict):
            passed = val_res.get("passed", False)
            feedback = val_res.get("feedback", "")
        else:
            passed = val_res.passed
            feedback = val_res.feedback
            
        callback_context.state["validation_passed"] = passed
        if not passed:
            callback_context.state["revision_feedback"] = feedback
        else:
            callback_context.state["revision_feedback"] = ""

validator_agent.after_agent_callback = process_validation

# 7. Escalation Checker (stops refinement loop)
class EscalationChecker(BaseAgent):
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

# 8. Platform Formatters
twitter_formatter = Agent(
    name="twitter_formatter",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""Format the following content for twitter.
Original Content:
{draft}

Platform Rules:
{formatting_rules_twitter}""",
    output_key="temp:formatted_twitter"
)

linkedin_formatter = Agent(
    name="linkedin_formatter",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""Format the following content for linkedin.
Original Content:
{draft}

Platform Rules:
{formatting_rules_linkedin}""",
    output_key="temp:formatted_linkedin"
)

instagram_formatter = Agent(
    name="instagram_formatter",
    model=Gemini(model="gemini-2.5-flash"),
    instruction="""Format the following content for instagram.
Original Content:
{draft}

Platform Rules:
{formatting_rules_instagram}""",
    output_key="temp:formatted_instagram"
)

formatters = ParallelAgent(
    name="formatters",
    sub_agents=[twitter_formatter, linkedin_formatter, instagram_formatter]
)

class ConsolidationAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        state = ctx.session.state
        formatted = {}
        for platform in ["twitter", "linkedin", "instagram"]:
            val = state.get(f"temp:formatted_{platform}")
            if val:
                formatted[platform] = val
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "formatted_content": formatted
            })
        )

# 9. Media Generator
class MediaGeneratorAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        from app.tools import generate_media_tool
        from google.adk.tools import ToolContext
        tool_ctx = ToolContext(ctx)
        await generate_media_tool(tool_ctx)
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "media_paths": tool_ctx.state.get("media_paths", [])
            })
        )

# 10. Publisher
class PublisherAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        from app.tools import publish_content_tool
        from google.adk.tools import ToolContext
        tool_ctx = ToolContext(ctx)
        await publish_content_tool(tool_ctx)
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={
                "published_urls": tool_ctx.state.get("published_urls", [])
            })
        )

# --- Orchestrator Definition ---

# Sequential pipeline wrapping all agents
pipeline = SequentialAgent(
    name="content_factory_pipeline",
    sub_agents=[
        planner_agent,
        DuplicateDetectorAgent(name="duplicate_detector"),
        ranker_agent,
        researcher_agent,
        refinement_loop,
        formatters,
        ConsolidationAgent(name="consolidation"),
        MediaGeneratorAgent(name="media_generator"),
        PublisherAgent(name="publisher")
    ]
)

pipeline.before_agent_callback = init_pipeline_state

# Root agent that intercepts the user's run call
class RootAgent(BaseAgent):
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        user_message = ""
        if ctx.session.events:
            last_event = ctx.session.events[-1]
            if hasattr(last_event, "content") and last_event.content:
                if hasattr(last_event.content, "parts") and last_event.content.parts:
                    user_message = "".join([p.text for p in last_event.content.parts if p.text])
                elif isinstance(last_event.content, str):
                    user_message = last_event.content
                    
        yield Event(
            author=self.name,
            actions=EventActions(state_delta={"temp:input_query": user_message})
        )
        
        async for event in pipeline.run_async(ctx):
            yield event

app = App(
    name="app",
    root_agent=RootAgent(name="root_agent")
)
