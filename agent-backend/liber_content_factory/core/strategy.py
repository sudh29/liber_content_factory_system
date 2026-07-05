"""
Content Strategy — Abstract Base Class.

Plugins should inherit from this class to define specific content behavior
for different content types (quotes, blog posts, threads, etc.).
"""

import abc
from typing import Dict, Optional

from liber_content_factory.core.models import ContentItem


class ContentStrategy(abc.ABC):
    """
    Base class for Content Generation Strategies.
    Plugins should inherit from this class to define specific content behavior.
    """

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Name of the strategy (e.g., 'daily_quotes', 'blog_post')."""
        pass

    @abc.abstractmethod
    def get_discovery_prompt(self, context_input: str) -> str:
        """Prompt used by the Planner/Research agent to discover or ideate content."""
        pass

    @abc.abstractmethod
    def get_generation_prompt(self, research_data: str, item: ContentItem) -> str:
        """Prompt used to generate the initial draft of the content."""
        pass

    @abc.abstractmethod
    def get_ranking_criteria(self) -> str:
        """Criteria used by the Ranking agent to score candidate items."""
        pass

    @abc.abstractmethod
    def get_validation_prompt(self) -> str:
        """Prompt used by the Validator agent to check the generated content."""
        pass

    @abc.abstractmethod
    def get_formatting_rules(self) -> Dict[str, str]:
        """Returns a dict mapping platform name (e.g., 'twitter', 'linkedin') to formatting rules."""
        pass

    @abc.abstractmethod
    def get_media_prompt(self, draft: str) -> Optional[str]:
        """Prompt to generate an image or media. Return None if no media is needed."""
        pass
