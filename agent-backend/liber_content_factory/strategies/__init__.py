"""
Strategy registry — maps strategy names to their implementations.
"""

from typing import Dict, Callable

from liber_content_factory.core.strategy import ContentStrategy


def _get_strategy_registry() -> Dict[str, Callable[[], ContentStrategy]]:
    """Returns the strategy registry. Uses lazy imports to avoid circular deps."""
    from liber_content_factory.strategies.quotes import DailyQuoteStrategy
    from liber_content_factory.strategies.generic import GenericContentStrategy

    return {
        "quotes": lambda: DailyQuoteStrategy(),
        "instagram": lambda: GenericContentStrategy("instagram"),
        "blog": lambda: GenericContentStrategy("blog"),
        "twitter_thread": lambda: GenericContentStrategy("twitter_thread"),
        "youtube_script": lambda: GenericContentStrategy("youtube_script"),
        "newsletter": lambda: GenericContentStrategy("newsletter"),
    }


def get_strategy(name: str) -> ContentStrategy:
    """Get a strategy instance by name.

    Args:
        name: Strategy name (e.g., 'quotes', 'blog', 'instagram').

    Returns:
        A ContentStrategy instance.

    Raises:
        ValueError: If the strategy name is not registered.
    """
    registry = _get_strategy_registry()
    if name not in registry:
        raise ValueError(f"Unknown strategy: '{name}'. Available: {list(registry.keys())}")
    return registry[name]()


def list_strategies() -> list[str]:
    """Returns all available strategy names."""
    return list(_get_strategy_registry().keys())
