"""
Command-line entry point for the Liber Content Factory.

Allows running content generation manually from the CLI without starting the HTTP server.
"""

import argparse
import asyncio
import logging
from pprint import pprint

from google.adk.sessions import Session

from liber_content_factory.config.settings import load_config
from liber_content_factory.strategies import list_strategies
from liber_content_factory.observability.telemetry import tracing_scope

# Import the actual ADK pipeline
from liber_content_factory.agents.pipeline import app as pipeline_app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def generate_content(strategy_name: str, topic: str):
    """Run the ADK pipeline to generate content for the given topic."""
    config = load_config()
    logger.info(f"Generating '{strategy_name}' content for topic: {topic}")

    session = Session(
        id="cli-session",
        appName="content-factory-cli",
        userId="cli-user",
    )
    session.state["strategy_name"] = strategy_name

    async with tracing_scope():
        # The input query format expected by the RootAgent
        input_query = f"Topic/Prompt: {topic}"
        
        events = []
        async for event in pipeline_app.run_async(session, input_query):
            events.append(event)
            if hasattr(event, 'actions') and event.actions.state_delta:
                logger.debug(f"State updated by {event.author}")

    print("\n" + "="*50)
    print("✨ GENERATION COMPLETE ✨")
    print("="*50)
    
    draft = session.state.get('draft', 'No draft generated.')
    print("\n--- FINAL DRAFT ---")
    print(draft)
    
    formatted = session.state.get('formatted_content', {})
    if formatted:
        print("\n--- FORMATTED FOR PLATFORMS ---")
        for platform, content in formatted.items():
            print(f"\n[{platform.upper()}]\n{content}")
            
    media = session.state.get('media_paths', [])
    if media:
        print("\n--- GENERATED MEDIA ---")
        for m in media:
            print(f" - {m}")
            
    print("\n" + "="*50)


def main():
    parser = argparse.ArgumentParser(description="Liber Content Factory CLI")
    
    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # 1. 'generate' command
    gen_parser = subparsers.add_parser("generate", help="Generate new content")
    gen_parser.add_argument(
        "--strategy", 
        type=str, 
        default="quotes",
        choices=list_strategies(),
        help="Content strategy to use"
    )
    gen_parser.add_argument(
        "--topic", 
        type=str, 
        required=True,
        help="Topic or theme for the content"
    )
    
    # 2. 'list' command
    subparsers.add_parser("list", help="List available strategies")

    args = parser.parse_args()

    if args.command == "list":
        strategies = list_strategies()
        print("Available strategies:")
        for s in strategies:
            print(f"  - {s}")
    elif args.command == "generate":
        try:
            asyncio.run(generate_content(args.strategy, args.topic))
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
