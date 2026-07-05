# How to Run the Liber Content Factory System

This guide explains how to set up, configure, and run both the Python multi-agent backend pipeline and the React/Vite social scheduling frontend.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
1. **Python 3.10+** (with `uv` recommended, or standard `pip`)
2. **Node.js 18+** and **npm**
3. A **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

---

## 1. Backend Setup & Execution (Python)

The backend orchestrates the multi-agent generation pipeline (Extractor → Researcher → Drafter → Validator).

### Installation
The project uses `pyproject.toml` for modern dependency management.

```bash
# Create a virtual environment and install dependencies
# Option A: Using standard pip
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Option B: Using uv (recommended)
uv venv
source .venv/bin/activate or source .venv/bin/activate.fish
uv pip install -e ".[dev]"
```

### Configuration
Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Open `.env` and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
*Note: We recommend using `gemini-2.5-flash` to avoid hitting free-tier 429 quota limits on `gemini-2.5-pro`.*

### Running the Pipeline CLI

You can trigger the multi-agent pipeline from your command line:

```bash
# Option A: Run using the installed CLI shortcut
content-factory --input "We need a blog post about how multi-agent systems are better than single LLMs."

# Option B: Run main.py directly via python or uv
uv run main.py --input "Explain the benefits of the MCP protocol."

# Load input from a local text file
uv run main.py --file path/to/prompt.txt

# Run with verbose logging for detailed agent step logs
uv run main.py --verbose --input "Write a thread about vibe coding."
```

### Running Agents Individually (Testing & Debugging)

Since this project is built using the Google Agent Development Kit (ADK), you can use the `agents-cli` to interact with and test your agents individually without running the full web server.

```bash
# Option A: Interactive Web Playground (Recommended)
# This opens a local web interface where you can chat with your agent, 
# inspect state changes, and see individual agent reasoning steps.
uvx google-agents-cli playground

# Option B: Run via CLI (Non-interactive)
# Run a single prompt through the agent pipeline and see the output in the terminal.
# Add -v for full JSON event payloads, which is great for debugging tool calls.
uvx google-agents-cli run "Write a thread about vibe coding." -v
```

### Running Backend Tests
Ensure all agent capabilities, guardrails, and validation retries are working:

```bash
pytest tests/ -v
```

---

## 2. Frontend Setup & Execution (React/Vite)

The React dashboard allows you to manage quotes, preview platform-specific card layouts, view audit logs, and trigger scheduled simulated publishing (Webhooks, Telegram).

### Installation
From the root directory (where `package.json` is located):

```bash
# Install NPM dependencies
npm install
```

### Running the Development Server
Start the local Vite development server:

```bash
npm run dev
```

Vite will start the server (usually on `http://localhost:5173`). Open this URL in your browser to view the **Daily Quotes Publisher** dashboard.

### Building for Production
To bundle the frontend assets for production deployment:

```bash
npm run build
```

---

## 3. Project Directory Structure Reference

```text
├── main.py                 # CLI entry point
├── pyproject.toml          # Python configuration and CLI scripts
├── package.json            # Node/Vite/Tailwind dependencies
├── vite.config.ts          # Vite bundler configuration
├── tailwind.config.js      # CSS styling framework configuration
├── index.html              # Main frontend HTML entry point
├── src/                    # Python package source code
│   ├── config.py           # Configuration loader (loads .env)
│   ├── orchestrator.py     # ContentPipeline orchestrator
│   ├── hooks.py            # Audit logging & observability hooks
│   ├── security_policies.py# Input/output security guardrails
│   └── agents/             # Specialized AI agents
├── tests/                  # Pytest test suite (43 test cases)
├── social-scheduler/       # React components and custom hooks
│   ├── SocialSchedulerApp.tsx # Main dashboard component
│   └── hooks/              # Extracted logic hooks (useQuotes, usePublishingEngine)
└── shared/                 # Shared frontend code (types, utils, data)
```
