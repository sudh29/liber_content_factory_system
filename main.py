import os
import sys
import asyncio
import logging
import argparse

# Configure enterprise-grade logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ContentFactory")


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Content Factory System - Multi-Agent Vibe Coding Capstone Pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "-i", "--input",
        type=str,
        default="We need a blog post about how multi-agent systems are better than single LLMs. Single LLMs suffer from context rot after 40k tokens.",
        help="Raw text input prompt for the Content Factory pipeline."
    )
    parser.add_argument(
        "-f", "--file",
        type=str,
        default=None,
        help="Path to a text file containing the input prompt (overrides --input if provided)."
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

    Falls back to Kaggle Secrets if running in a Kaggle environment.
    """
    # Try loading from .env file first
    try:
        from dotenv import load_dotenv
        load_dotenv()
        logger.debug("Loaded environment from .env file.")
    except ImportError:
        logger.debug("python-dotenv not installed; skipping .env file loading.")

    # Try Kaggle secrets as fallback for Kaggle notebook environments
    if "GEMINI_API_KEY" not in os.environ:
        try:
            from kaggle_secrets import UserSecretsClient
            user_secrets = UserSecretsClient()
            os.environ["GEMINI_API_KEY"] = user_secrets.get_secret("GEMINI_API_KEY")
            logger.info("Loaded GEMINI_API_KEY from Kaggle Secrets.")
        except (ImportError, Exception):
            pass  # Not in Kaggle — config.load_config() will validate below

    # Final validation is handled by src.config.load_config()


async def main_async(args):
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
        logger.debug("Verbose debug logging enabled.")

    logger.info("Initializing Content Factory...")

    # Environment provisioning
    _load_environment()

    # Load validated configuration
    from src.config import load_config
    config = load_config()

    # Determine raw input
    raw_input = args.input
    if args.file:
        try:
            with open(args.file, "r", encoding="utf-8") as f:
                raw_input = f.read()
            logger.info(f"Loaded input prompt from file: {args.file}")
        except Exception as e:
            logger.error(f"Failed to read input file '{args.file}': {e}")
            sys.exit(1)

    # Build and run the pipeline
    from src.orchestrator import ContentPipeline
    from src.security_policies import setup_policies
    from src.hooks import register_hooks

    pipeline = ContentPipeline(config)
    setup_policies(pipeline)
    register_hooks(pipeline, log_dir=str(config.audit_log_dir))

    logger.info(
        f"Submitting raw input: {raw_input[:120]}..."
        if len(raw_input) > 120
        else f"Submitting raw input: {raw_input}"
    )
    try:
        result = await pipeline.run(raw_input)
        logger.info("=== Pipeline Finished Successfully ===")
        logger.info(f"Long form preview:\n{result.long_form_draft[:200]}...")
        logger.info(f"Short form draft:\n{result.short_form_draft}")
        if result.research_doc_path and os.path.exists(result.research_doc_path):
            logger.info(f"Research document generated at: {result.research_doc_path}")
    except Exception as e:
        logger.error(f"Pipeline failed with exception: {e}")
        sys.exit(1)


def cli_entry():
    """Entry point for the `content-factory` console script."""
    args = parse_arguments()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    cli_entry()
