"""
Generic Content Strategy — Flexible strategy for various content types.

Supports: instagram, blog, twitter_thread, youtube_script, newsletter.
"""

from typing import Dict, Optional

from liber_content_factory.core.strategy import ContentStrategy
from liber_content_factory.core.models import ContentItem


class GenericContentStrategy(ContentStrategy):
    def __init__(self, content_type: str = "instagram"):
        self._type = content_type

    @property
    def name(self) -> str:
        return f"generic_{self._type}"

    def get_discovery_prompt(self, context_input: str) -> str:
        return f"""You are an expert Content Discovery Agent.
Generate 5 diverse, highly engaging candidate ideas/themes for a {self._type} post/article.

Context/Theme from User: "{context_input}"

Format the output strictly as JSON following the DiscoverySchema."""

    def get_generation_prompt(self, research_data: str, item: ContentItem) -> str:
        type_guides = {
            "instagram": "an engaging Instagram caption with rich emojis, a hook, body text, and line breaks. Add a question at the end for CTA.",
            "blog": "a comprehensive, structured blog post in Markdown format. Use clear headings (H2, H3), subheadings, introduction, main body sections, and a conclusion.",
            "twitter_thread": "a sequence of 3-5 short, connected tweets (a Twitter thread). Use 🧵 and numbers like (1/5), (2/5) to structure it. Keep each tweet under 280 characters.",
            "youtube_script": "a video script containing a visual hook/cue, narrative voiceover (VO) lines, visual directions in brackets, and a strong like/subscribe Call-To-Action.",
            "newsletter": "a rich email newsletter layout in Markdown. Include an engaging subject line, greeting, informative body sections, bullet points for readability, and a professional sign-off."
        }
        guide = type_guides.get(self._type, "an engaging social media post.")

        return f"""You are an expert Content Writer. Write {guide} based on the selected candidate content and research.

Topic/Candidate Content:
{item.raw_content}

Background Research/Context:
{research_data}

Provide:
1. The written content in its full, optimized structure.
2. At least 3 relevant hashtags.
3. A strong Call-To-Action (CTA)."""

    def get_ranking_criteria(self) -> str:
        return """Score the candidates based on:
1. Relevance to the input topic (0-3 points).
2. Interest level and uniqueness (0-3 points).
3. Engagement and conversion potential (0-4 points).
"""

    def get_validation_prompt(self) -> str:
        return f"""Ensure the draft meets the following quality criteria:
1. The formatting is highly optimized for a {self._type} format.
2. Content is original, educational/motivating, and free of generic filler.
3. It ends with a clear Call-To-Action (CTA) and has at least 3 hashtags.
"""

    def get_formatting_rules(self) -> Dict[str, str]:
        if self._type == "instagram":
            return {
                "instagram": "Engaging visual caption style. Emojis. Clear line-breaks. Engaging question at the end. At least 5 hashtags.",
                "twitter": "Max 280 characters. Extremely short summary. 1 hashtag.",
                "linkedin": "Professional translation. Short outline."
            }
        elif self._type == "blog":
            return {
                "blog": "Detailed Markdown formatting with H2, H3 tags.",
                "linkedin": "A summary of the blog post highlighting key lessons, directing users to the full article."
            }
        elif self._type == "twitter_thread":
            return {
                "twitter": "The full thread output formatted as separate tweets.",
                "linkedin": "A single post summarizing the key points of the thread."
            }
        else:
            return {
                "main": "The complete script or content formatted for publication.",
                "twitter": "Short promotional tweet.",
                "linkedin": "Professional summary."
            }

    def get_media_prompt(self, draft: str) -> Optional[str]:
        return f"A vibrant, modern social media asset illustration. High visual fidelity. Theme related to the draft: {draft[:100]}"
