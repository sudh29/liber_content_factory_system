import abc
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class ContentItem:
    """Represents a candidate piece of content."""
    raw_content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    score: float = 0.0

@dataclass
class PipelineContext:
    """Holds the evolving state of a single pipeline run."""
    raw_input: str
    topic: Optional[str] = None
    research_data: Optional[str] = None
    candidate_items: List[ContentItem] = field(default_factory=list)
    selected_item: Optional[ContentItem] = None
    draft: Optional[str] = None
    formatted_content: Dict[str, str] = field(default_factory=dict) # Platform -> Content
    media_paths: List[str] = field(default_factory=list)
    published_urls: List[str] = field(default_factory=list)
