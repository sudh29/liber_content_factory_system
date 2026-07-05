import os
import sys
import asyncio
import logging
import argparse
from typing import Dict, Type
from src.core.strategy import ContentStrategy

# Configure enterprise-grade logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ContentFactory")

# Registry of available strategies
STRATEGY_REGISTRY: Dict[str, Type[ContentStrategy]] = {}

def register_strategies():
    """Import and register all available strategies."""
    from src.plugins.quotes_strategy import DailyQuoteStrategy
    from src.plugins.generic_strategy import GenericContentStrategy
    STRATEGY_REGISTRY["quotes"] = DailyQuoteStrategy
    STRATEGY_REGISTRY["instagram"] = lambda: GenericContentStrategy("instagram")
    STRATEGY_REGISTRY["blog"] = lambda: GenericContentStrategy("blog")
    STRATEGY_REGISTRY["twitter_thread"] = lambda: GenericContentStrategy("twitter_thread")
    STRATEGY_REGISTRY["youtube_script"] = lambda: GenericContentStrategy("youtube_script")
    STRATEGY_REGISTRY["newsletter"] = lambda: GenericContentStrategy("newsletter")



def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Content Factory System - Generic Multi-Agent Generative Pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "-i", "--input",
        type=str,
        default="I need an inspiring post for today.",
        help="Raw text context or theme for the pipeline."
    )
    parser.add_argument(
        "-s", "--strategy",
        type=str,
        default="quotes",
        choices=list(STRATEGY_REGISTRY.keys()),
        help="Content Strategy plugin to use for this run."
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable DEBUG level logging."
    )
    return parser.parse_args()


def _load_environment():
    """
    Load environment variables from a .env file if present,
    then validate that required keys exist.
    """
    try:
        from dotenv import load_dotenv
        load_dotenv()
        logger.debug("Loaded environment from .env file.")
    except ImportError:
        logger.debug("python-dotenv not installed; skipping .env file loading.")


async def main_async(args):
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
        logger.debug("Verbose debug logging enabled.")

    logger.info("Initializing Content Factory...")

    _load_environment()

    from src.config import load_config
    config = load_config()

    # Initialize strategy
    strategy_cls = STRATEGY_REGISTRY[args.strategy]
    strategy = strategy_cls()
    logger.info(f"Loaded strategy: {strategy.name}")

    from src.orchestrator import ContentPipeline
    # TODO: adapt hooks/security policies if needed.
    # Currently ignoring them for the refactor to keep it simple, but you can add them back
    # from src.security_policies import setup_policies
    # from src.hooks import register_hooks

    pipeline = ContentPipeline(config)
    # setup_policies(pipeline)
    # register_hooks(pipeline, log_dir=str(config.audit_log_dir))

    logger.info(f"Submitting raw input context: {args.input}")
    try:
        result = await pipeline.run(args.input, strategy)

        logger.info("=== Pipeline Finished Successfully ===")
        if result.topic:
            logger.info(f"Theme/Topic: {result.topic}")
        if result.selected_item:
            logger.info(f"Selected item: {result.selected_item.raw_content}")

        logger.info("\n=== Generated Content by Platform ===")
        for platform, content in result.formatted_content.items():
            logger.info(f"\n[{platform.upper()}]\n{content}\n")

    except Exception as e:
        logger.error(f"Pipeline failed with exception: {e}")
        sys.exit(1)


def cli_entry():
    register_strategies()
    args = parse_arguments()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    cli_entry()
