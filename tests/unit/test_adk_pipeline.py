import os
import json
import pytest
from unittest.mock import patch, MagicMock
from google.adk.runners import InMemoryRunner
from google.adk.models import Gemini
from google.adk.models.llm_response import LlmResponse
from google.genai import types

from app.agent import app

# --- Mock Response Generator ---

async def mock_generate_content_async(self, llm_request, stream=False):
    config = getattr(llm_request, "config", None)
    schema = getattr(config, "response_schema", None)
    schema_str = str(schema) if schema else ""
    
    sys_inst = ""
    if config and getattr(config, "system_instruction", None):
        inst_content = config.system_instruction
        if hasattr(inst_content, "parts") and inst_content.parts:
            sys_inst = "".join([p.text for p in inst_content.parts if p.text])
        elif isinstance(inst_content, str):
            sys_inst = inst_content

    req_str = ""
    if llm_request.contents:
        for content in llm_request.contents:
            if content.parts:
                for part in content.parts:
                    if part.text:
                        req_str += part.text

    if "DiscoverySchema" in schema_str or "DiscoverySchema" in sys_inst:
        text = '{"items": ["Pioneering AI", "Code Quality Matters"], "topic": "Technology"}'
    elif "ScoringSchema" in schema_str or "ScoringSchema" in sys_inst:
        text = '{"scores": [9.5, 8.5]}'
    elif "EvaluationResult" in schema_str or "EvaluationResult" in sys_inst:
        text = '{"passed": true, "feedback": ""}'
    elif "twitter" in sys_inst.lower() or "twitter" in req_str.lower():
        text = "Formatted for Twitter"
    elif "linkedin" in sys_inst.lower() or "linkedin" in req_str.lower():
        text = "Formatted for LinkedIn"
    elif "instagram" in sys_inst.lower() or "instagram" in req_str.lower():
        text = "Formatted for Instagram"
    else:
        text = "Mock pipeline generated draft"
        
    yield LlmResponse(content=types.Content(parts=[types.Part(text=text)]))


# --- Mock Embeddings Response ---

class MockEmbeddingsResponse:
    def __init__(self):
        class Embedding:
            def __init__(self):
                self.values = [0.1] * 768
        self.embeddings = [Embedding()]

class MockAioModels:
    async def embed_content(self, model, contents, config=None):
        class Embedding:
            def __init__(self, values):
                self.values = values
                
        res = MockEmbeddingsResponse()
        if isinstance(contents, list):
            embeddings = []
            for item in contents:
                if "Pioneering" in item:
                    embeddings.append(Embedding(values=[0.1] * 768))
                else:
                    embeddings.append(Embedding(values=[0.0, 1.0] + [0.0] * 766))
            res.embeddings = embeddings
        else:
            if "Pioneering" in contents:
                res.embeddings = [Embedding(values=[0.1] * 768)]
            else:
                res.embeddings = [Embedding(values=[0.0, 1.0] + [0.0] * 766)]
        return res

class MockAio:
    def __init__(self):
        self.models = MockAioModels()

class MockGenaiClient:
    def __init__(self, *args, **kwargs):
        self.aio = MockAio()


# --- Test Suite ---

@pytest.mark.asyncio
async def test_adk_pipeline_execution(tmp_path):
    (tmp_path / "output").mkdir(exist_ok=True)
    mock_history_path = str(tmp_path / "output" / "published_history.json")
    
    history_entry = {
        "raw_content": "Pioneering AI",
        "topic": "Technology",
        "urls": ["https://twitter.com/mock_post_id"],
        "embedding": [0.1] * 768
    }
    with open(mock_history_path, "w") as f:
        json.dump([history_entry], f)

    # Patch inside app.tools namespace for the genai.Client
    with patch.object(Gemini, "generate_content_async", mock_generate_content_async), \
         patch("app.tools.genai.Client", MockGenaiClient), \
         patch("app.tools.HISTORY_FILE", mock_history_path):
         
        runner = InMemoryRunner(agent=app.root_agent, app_name="app")
        await runner.session_service.create_session(app_name="app", user_id="user", session_id="s1")
        
        msg = types.Content(role="user", parts=[types.Part(text="Inspiring tech quote")])
        
        events = []
        async for event in runner.run_async(user_id="user", session_id="s1", new_message=msg):
            events.append(event)
            
        session = await runner.session_service.get_session(app_name="app", user_id="user", session_id="s1")
        state = session.state
        
        assert state.get("topic") == "Technology"
        assert len(state.get("candidate_items", [])) == 1
        assert state.get("candidate_items")[0]["raw_content"] == "Code Quality Matters"
        assert state.get("selected_item")["raw_content"] == "Code Quality Matters"
        assert "Mock pipeline generated draft" in state.get("draft")
        
        formatted = state.get("formatted_content", {})
        assert "twitter" in formatted
        assert "linkedin" in formatted
        assert "instagram" in formatted
        
        assert len(state.get("media_paths", [])) == 1
        assert state.get("media_paths")[0].endswith("generated_media_1.png")
        assert len(state.get("published_urls", [])) == 3
        
        with open(mock_history_path, "r") as f:
            history = json.load(f)
        assert len(history) == 2
        assert history[1]["raw_content"] == "Code Quality Matters"
        assert "embedding" in history[1]
