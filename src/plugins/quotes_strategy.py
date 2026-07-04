from typing import Dict, Optional
from src.core.strategy import ContentStrategy
from src.core.models import ContentItem

class DailyQuoteStrategy(ContentStrategy):
    @property
    def name(self) -> str:
        return "daily_quotes"

    def get_discovery_prompt(self, context_input: str) -> str:
        return f"""You are an expert Content Discovery Agent.
Generate 5 diverse, highly motivating, and profound quotes from famous personalities (scientists, entrepreneurs, authors, philosophers, leaders, athletes, historical figures).

Context/Theme from User: "{context_input}"

Format the output strictly as JSON following the DiscoverySchema."""

    def get_generation_prompt(self, research_data: str, item: ContentItem) -> str:
        return f"""You are an expert AI Content Generator. Enhance the following quote to make it highly engaging for a social media post.

Quote:
{item.raw_content}

Background Research/Context:
{research_data}

Provide:
1. A meaningful explanation of the quote.
2. Practical life lessons or modern-day relevance.
3. Suggested hashtags.
4. A strong Call-To-Action (CTA) encouraging engagement (e.g., asking a question).

Draft the response as a single, cohesive text block that can be adapted for multiple platforms."""

    def get_ranking_criteria(self) -> str:
        return """Score the quotes based on:
1. Relevance to current events, motivation, and inspiration (0-3 points).
2. Profundity and depth of the message (0-3 points).
3. Engagement potential (how likely it is to be shared or commented on) (0-4 points).

Higher scores mean the quote is better suited for today's daily post."""

    def get_validation_prompt(self) -> str:
        return """Ensure the draft meets the following quality criteria:
1. It contains the exact original quote.
2. The explanation is meaningful and not generic fluff.
3. It includes at least 3 relevant hashtags.
4. It ends with a clear Call-To-Action (CTA)."""

    def get_formatting_rules(self) -> Dict[str, str]:
        return {
            "twitter": "Max 280 characters. Keep it punchy. Use 1-2 hashtags max. Put the quote in quotes and tag the author if possible.",
            "linkedin": "Professional tone. Expand slightly on the practical life lesson. Use line breaks for readability. 3-5 hashtags at the bottom.",
            "instagram": "Engaging, visual caption style. Use emojis. Put the quote at the very top. Ask an engaging question at the end for the CTA. Lots of hashtags.",
        }

    def get_media_prompt(self, draft: str) -> Optional[str]:
        return f"A visually striking, minimalist, high-quality quote card background suitable for Instagram, featuring moody lighting and typography space. Theme related to the draft: {draft[:100]}"
