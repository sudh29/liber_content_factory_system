from types import SimpleNamespace

from google.genai.errors import ClientError

from liber_content_factory.services.fallback import generate_fallback_content


class DummyStrategy:
    def get_generation_prompt(self, research_data: str, item) -> str:
        assert hasattr(item, "raw_content")
        return f"prompt:{item.raw_content}"

    def get_validation_prompt(self) -> str:
        return "validate"

    def get_formatting_rules(self) -> dict:
        return {"twitter": "rule"}


class DummyResponse:
    text = "draft"


class DummyClient:
    class models:
        @staticmethod
        def generate_content(*args, **kwargs):
            return DummyResponse()


def test_generate_fallback_content_adapts_quote_to_content_item(monkeypatch) -> None:
    monkeypatch.setattr(
        "liber_content_factory.services.fallback.load_config",
        lambda: SimpleNamespace(model="gemini-test"),
    )
    monkeypatch.setattr(
        "liber_content_factory.services.fallback.get_strategy",
        lambda strategy_name: DummyStrategy(),
    )
    monkeypatch.setattr(
        "liber_content_factory.services.fallback.genai.Client",
        lambda: DummyClient(),
    )

    result = generate_fallback_content(
        prompt_text="A test prompt",
        quote={"text": "Stay curious", "author": "Ada"},
        strategy_name="quotes",
    )

    assert result["draft"] == "draft"
    assert result["formatted"]["twitter"] == "draft"


def test_generate_fallback_content_handles_gemini_quota(monkeypatch) -> None:
    monkeypatch.setattr(
        "liber_content_factory.services.fallback.load_config",
        lambda: SimpleNamespace(model="gemini-test"),
    )
    monkeypatch.setattr(
        "liber_content_factory.services.fallback.get_strategy",
        lambda strategy_name: DummyStrategy(),
    )

    class QuotaClient:
        class models:
            @staticmethod
            def generate_content(*args, **kwargs):
                raise ClientError(429, {"error": {"message": "quota exhausted"}})

    monkeypatch.setattr(
        "liber_content_factory.services.fallback.genai.Client",
        lambda: QuotaClient(),
    )

    result = generate_fallback_content(
        prompt_text="A test prompt",
        quote={"text": "Stay curious", "author": "Ada"},
        strategy_name="quotes",
    )

    assert result["error"] == "gemini_quota_exhausted"
    assert "temporarily unable" in result["draft"]
    assert result["evaluation"]["passed"] is False
