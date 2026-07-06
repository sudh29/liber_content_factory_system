# Liber Content Factory: An Enterprise Multi-Agent Content Automation Framework

**Capstone Submission — AI Agents: Intensive Vibe Coding (Google × Kaggle)**  
**Track:** Agents for Business  
**Repository:** [github.com/sudh29/liber_content_factory_system](https://github.com/sudh29/liber_content_factory_system)  
**YouTube Walkthrough:** [https://www.youtube.com/watch?v=iAzrd1AmMMg](https://www.youtube.com/watch?v=iAzrd1AmMMg)  

---

## TL;DR

I built a **reusable, multi-agent content generation and publishing framework**, not a single-purpose demo. The first end-to-end proof of concept running on top of it is a **Daily Quote Generator**: an autonomous pipeline that discovers quotes, checks them against publishing history to avoid repeats, ranks candidates by relevance, researches context, drafts and self-validates the copy through a generate→critique loop, formats it per platform, generates accompanying media, and publishes to Twitter/X, LinkedIn, Instagram, Telegram, and WhatsApp — with an OpenTelemetry-instrumented, guardrail-checked pipeline behind a React dashboard for human oversight.

The architecture is deliberately generic: swapping the "strategy" module lets the same nine-agent pipeline drive blog posts, newsletters, product announcements, or any other recurring content workflow.

---

## The Problem

Anyone who creates recurring content — motivational quotes, newsletters, product updates, educational posts — ends up doing the same four things by hand, every time: find something worth saying, make sure it's not a repeat of something already posted, adapt it for each platform's tone and character limits, and publish it on schedule. It's repetitive enough to automate, but it needs *judgment* at almost every step (is this quote actually good? does this draft meet quality bar? is this safe to publish?) — which makes it a natural fit for an agentic system rather than a fixed script.

Most "AI content generator" projects solve this narrowly for one platform or one content type. I wanted to build the underlying **framework** once, well, and treat the quote generator as the first tenant of it.

---

## What It Does

The **Daily Quote Generator** is the demonstration workflow:

1. **Discovery** — an agent generates a diverse slate of candidate quotes from scientists, entrepreneurs, authors, philosophers, leaders, athletes, and historical figures, seeded by an optional user topic.
2. **Duplicate detection** — every candidate is checked against publishing history: has this exact quote run before? Has something too similar run recently? Is one author over-represented?
3. **Context-aware ranking** — surviving candidates are scored against criteria like relevance to the date, current events, motivational strength, and engagement potential, and the best one is selected.
4. **Research** — a research agent adds historical/biographical context about the quote and its author.
5. **Generate → Validate refinement loop** — a drafting agent writes the explanation, life lessons, hashtags, and CTA; a validator agent checks the draft against quality criteria (contains the original quote verbatim, real hashtags, a clear CTA, no generic fluff) and kicks it back for revision — up to 3 iterations — before it's allowed through.
6. **Platform formatting** — the validated draft is adapted into Twitter/X (≤280 chars, 1–2 hashtags), LinkedIn (professional tone, line breaks, 3–5 hashtags), and Instagram (emoji-forward, engagement question, hashtag-heavy) variants in parallel.
7. **Media generation** — an optional agent produces a matching quote card / illustration.
8. **Publishing** — a publisher agent distributes the final package to the configured channels (Telegram bot API, WhatsApp via a local WAHA bridge, generic webhooks), and the run is fully logged.

All of this is exposed through a React/Vite dashboard where a human can preview per-platform renderings, inspect the audit log of every agent's reasoning, and trigger or schedule publishing — the agents propose, the dashboard lets a human stay in the loop.

---

## Architecture

The framework is a strict **sequential multi-agent pipeline**, built on Google's Agent Development Kit (ADK), with one loop embedded for iterative self-correction:

```
User Request
      │
      ▼
Root Agent (extracts + routes the message)
      │
      ▼
Strategy Resolver (picks "quotes" vs. any other content strategy)
      │
      ▼
Planner Agent            → generates candidate ideas
      │
      ▼
Duplicate Detector Agent  → filters against publish history
      │
      ▼
Ranker Agent              → scores + selects the best candidate
      │
      ▼
Researcher Agent          → adds background context
      │
      ▼
┌─────────────────────────┐
│  Refinement Loop (×3)   │
│  Generator → Validator  │  ← LoopAgent, escalates out once validation passes
│  → Escalation Checker   │
└─────────────────────────┘
      │
      ▼
Formatters (Twitter / LinkedIn / Instagram, in parallel)
      │
      ▼
Consolidation Agent
      │
      ▼
Media Generator Agent
      │
      ▼
Publisher Agent → Telegram / WhatsApp (WAHA) / Webhooks
```

Two ADK primitives do the heavy lifting: a `SequentialAgent` wires the whole pipeline together, and a `LoopAgent` wraps the generate/validate step so drafts iterate against a validator instead of being accepted on the first pass. A lightweight `RootAgent` sits in front of everything purely to pull the user's message out of the session and hand it to the pipeline — keeping message-parsing separate from orchestration logic.

The content-type logic itself is pulled out into a **strategy pattern** (`DailyQuoteStrategy`, `GenericContentStrategy`) — each strategy supplies its own discovery prompt, ranking criteria, validation rubric, and per-platform formatting rules. This is what makes the framework reusable: adding a new content type is "write a new strategy class," not "rebuild the pipeline."

### Skills

On top of the ADK pipeline, I also defined three portable **Skills** (`context-extractor`, `linkedin-hook-generator`, `qa-validator`) as `SKILL.md` files with explicit goals, step-by-step instructions, and hard constraints — the same "skills as reusable, declarative capability packages" pattern covered in the course's context-engineering material, kept separate from the core agent code so they can be dropped into other agents later.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Agent orchestration | Google Agent Development Kit (ADK) — `SequentialAgent`, `LoopAgent`, custom `BaseAgent` subclasses |
| Model | Gemini 2.5 Flash (configurable via `.env`, deliberately defaulted away from Pro to stay inside free-tier quota) |
| Backend | Python 3.10+, `uv` for dependency management, FastAPI-style HTTP layer (`server.py`) for the dashboard to call |
| Frontend | React + Vite + TypeScript + Tailwind, with dedicated hooks for content (`useContent`), publishing (`usePublishingEngine`), and agent sessions (`useAgentSession`) |
| Observability | OpenTelemetry, with pluggable exporters (Google Cloud Trace, OTLP, or console in dev) |
| Storage & Persistence | Abstracted `StorageRepository` supporting atomic local file replacement (`.tmp`) and Cloud SQL / PostgreSQL relational databases with WAL journaling |
| Publishing channels | Telegram Bot API, WhatsApp via WAHA (self-hosted WhatsApp HTTP API), generic outbound webhooks |
| Testing | pytest — 35 automated unit/security tests (100% pass rate) and an `agents-cli`-based eval harness with a JSON eval dataset |

---

## Course Concepts Applied

Mapping the build back to the five days of the course:

- **Day 1 — Vibe coding as the primary interface:** the whole backend was built by describing agent behavior and pipeline shape in natural language and iterating against real outputs, rather than hand-writing orchestration logic first.
- **Day 2 — Tools & interoperability:** each publishing channel (Telegram, WhatsApp/WAHA, webhooks) is wrapped as a discrete tool/service module the Publisher agent calls, so adding a new channel doesn't touch agent logic.
- **Day 3 — Context engineering, sessions, skills, memory:** the strategy pattern and `SKILL.md` files are the "skills" layer; ADK session `state` (with explicit keys like `draft`, `formatted_content`, `validation_passed`) is the working memory that flows between agents; duplicate detection against publish history is the framework's long-term memory.
- **Day 4 — Quality & security:** the refinement loop is a built-in eval-and-retry mechanism (max 3 iterations); a separate guardrails module does input-safety checks (length limits, basic prompt-injection keyword blocking) and output-safety checks (harmful-content blocklist, minimum-length sanity check) before content is trusted; a dedicated `agents-cli`-driven eval dataset and pytest suite (including a security-policy test file) back this up.
- **Day 5 — Prototype to production:** OpenTelemetry tracing with a Cloud Trace exporter path, a documented deploy flow (`agents-cli deploy`, Terraform-based infra scaffolding), Docker Compose for local orchestration, and a `deployment_metadata.json` used for tracking the live remote agent runtime.

---

## Security & Guardrails

Rather than trusting model output blindly, every run passes through multi-layered enterprise security defenses:

- **API Gateway Defense (`gateway.py`)** — Implements an IP-based sliding window rate limiter (`RateLimiter`, default 5 req/min) and Bearer Token / API Key verification (`AuthGateway`) on all HTTP generation endpoints to prevent Denial of Service (DoS) attacks and LLM token quota depletion.
- **Input validation** — Prompt length limits and a keyword blocklist (`"ignore previous instructions"`, `"system prompt"`, `"bypass"`, `"jailbreak"`) to catch obvious prompt injection attempts before they reach Gemini.
- **Output validation** — Minimum-length sanity checks, harmful-content blocklists, and secret key detection (e.g., preventing accidental API key leakage) before drafts proceed to formatting and publishing.
- **Self-critique before publish** — The generate→validate loop ensures the model adversarially checks its own work (verbatim quote accuracy, real hashtags present, CTA present, no generic filler) before reaching formatting, bounded by a hard cap of 3 iterations.

---

## Evaluation & Testing

- **100% Automated Test Pass Rate** — The suite includes **35 automated pytest integration and guardrail tests** covering pipeline orchestration, rate limiting, authentication, and database repository persistence.
- **Unit & Security Suites** — Unit tests verify ADK pipeline wiring (`test_adk_pipeline.py`), WhatsApp/WAHA tool integration, rate limiting/auth (`test_gateway.py`), and storage repositories (`test_storage_repo.py`). A dedicated `test_security_policies.py` suite exercises input/output prompt injection defenses directly.
- **Quality Flywheel & Eval Harness** — Beyond pytest, the project uses the `agents-cli` eval surface with a curated JSON eval dataset (`tests/eval/datasets/basic-dataset.json`) that runs through `agents-cli eval generate` → `agents-cli eval grade`, supporting `eval compare` for regression checks and `eval analyze` for clustering failure modes.

---

## What I'd Build Next

- Harden the guardrails from keyword-blocklist heuristics to a proper classifier-based safety check.
- Expand past the quotes strategy to a second, genuinely different content type (e.g., a newsletter strategy) to stress-test how "generic" the generic pipeline really is.
- Wire the Analytics & Feedback stage (present in the architecture vision, not yet implemented) so engagement data can actually feed back into the ranking criteria.
- Add real image-generation output (currently the media step is scaffolded but not wired to a live image model end-to-end).

---

## Links & Setup Instructions

- **GitHub Repository:** [https://github.com/sudh29/liber_content_factory_system](https://github.com/sudh29/liber_content_factory_system)
- **YouTube Video Walkthrough:** [https://www.youtube.com/watch?v=iAzrd1AmMMg](https://www.youtube.com/watch?v=iAzrd1AmMMg)
- **Setup Instructions:** Complete instructions for local execution, Docker Compose deployment, environment configuration, and WhatsApp WAHA integration are documented in the root `README.md` and `RUN.md`.