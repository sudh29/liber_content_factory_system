# Agents Backend README

This folder contains the individual agent modules that power the content-generation pipeline.

## 1. Prerequisites

From the backend root:

```bash
cd /home/liber_primus/code/liber_content_factory_system/agent-backend
uv sync
```

Make sure your environment file exists and contains at least:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

If you do not already have a local env file:

```bash
cp .env.example .env
```

---

## 2. Run the full pipeline

This runs the end-to-end workflow through the orchestration layer:

```bash
uv run python main.py generate --strategy quotes --topic "AI and creativity"
```

Expected result:
- planner produces candidate ideas
- duplicate filter removes bad matches
- ranker selects the best candidate
- researcher adds background context
- generator creates a draft
- validator checks quality
- formatter adapts content for platforms
- publisher distributes the result

---

## 3. Smoke-check each agent individually

These commands only verify that each agent module imports correctly and is wired up.

### Planner

```bash
uv run python - <<'PY'
from liber_content_factory.agents.planner import planner_agent
print(planner_agent.name)
PY
```

### Duplicate detector

```bash
uv run python - <<'PY'
from liber_content_factory.agents.duplicate_detector import DuplicateDetectorAgent
print(DuplicateDetectorAgent.__name__)
PY
```

### Ranker

```bash
uv run python - <<'PY'
from liber_content_factory.agents.ranker import ranker_agent
print(ranker_agent.name)
PY
```

### Researcher

```bash
uv run python - <<'PY'
from liber_content_factory.agents.researcher import researcher_agent
print(researcher_agent.name)
PY
```

### Generator

```bash
uv run python - <<'PY'
from liber_content_factory.agents.generator import generator_agent
print(generator_agent.name)
PY
```

### Validator

```bash
uv run python - <<'PY'
from liber_content_factory.agents.validator import validator_agent
print(validator_agent.name)
PY
```

### Formatters

```bash
uv run python - <<'PY'
from liber_content_factory.agents.formatters import formatters, twitter_formatter, linkedin_formatter, instagram_formatter
print(formatters.name)
print(twitter_formatter.name)
print(linkedin_formatter.name)
print(instagram_formatter.name)
PY
```

### Media generator

```bash
uv run python - <<'PY'
from liber_content_factory.agents.media_generator import MediaGeneratorAgent
print(MediaGeneratorAgent.__name__)
PY
```

### Publisher

```bash
uv run python - <<'PY'
from liber_content_factory.agents.publisher import PublisherAgent
print(PublisherAgent.__name__)
PY
```

### Refinement loop

```bash
uv run python - <<'PY'
from liber_content_factory.agents.refinement_loop import refinement_loop
print(refinement_loop.name)
PY
```

### Pipeline assembly

```bash
uv run python - <<'PY'
from liber_content_factory.agents.pipeline import app
print(app.name)
PY
```

---

## 4. Basic validation checklist

After running the full pipeline, confirm these outputs are present:

- `draft` contains generated content
- `formatted_content` contains platform-specific variants
- `media_paths` is populated if media generation is enabled
- `published_urls` is populated if publishing succeeds

If anything is missing, inspect the logs printed by the backend process.

---

## 5. Useful debugging tips

- If imports fail, confirm you are running from the backend directory.
- If the agent does not respond, verify the Gemini credentials are valid.
- If the pipeline stops early, check the state keys written by the previous agent.
- For faster debugging, run the full pipeline with a short topic first.

---

## 6. Optional: run the backend API server

If you want to test through the HTTP layer instead of the CLI:

```bash
uv run python server.py
```

Then call the backend endpoints from the frontend or with a tool such as curl.
