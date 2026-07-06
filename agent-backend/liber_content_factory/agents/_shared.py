"""
Shared model configuration used by all LLM-backed agents.

Centralizing the Gemini model instance here avoids circular imports
and provides a single point to change model settings.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from google.adk.models import Gemini
from google.genai import types

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

gemini_model = Gemini(
    model=os.environ["GEMINI_MODEL"],
    retry_options=types.HttpRetryOptions(initial_delay=1, attempts=1)
)
