"""
Shared model configuration used by all LLM-backed agents.

Centralizing the Gemini model instance here avoids circular imports
and provides a single point to change model settings.
"""

import os

from google.adk.models import Gemini
from google.genai import types

gemini_model = Gemini(
    model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
    retry_options=types.HttpRetryOptions(initial_delay=30, attempts=3)
)
