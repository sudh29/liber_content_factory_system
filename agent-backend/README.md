# AI Content Generation Agents

## Project Overview

I created this repository to build a **generic AI-powered Content Generation Agent Framework** that can automate the complete content creation and publishing workflow across multiple social media platforms.

Instead of building an agent for only one use case, the goal is to create a reusable, modular, and extensible multi-agent system that can generate different types of content, including:

* Daily motivational quotes
* Instagram posts
* Twitter/X posts
* LinkedIn posts
* YouTube Shorts scripts
* Blog articles
* WhatsApp and Telegram broadcasts
* Newsletters
* Product announcements
* Educational content
* Marketing campaigns

The **Daily Quotes Generator** serves as the first end-to-end demonstration of the framework.

---

# Demonstration Use Case: Daily Quote Generator

The Daily Quote Generator is not just a quote generator—it is an autonomous AI workflow that performs multiple intelligent tasks before publishing content.

### Step 1 — Content Discovery

The agent collects quotes from trusted sources and famous personalities such as:

* Scientists
* Entrepreneurs
* Authors
* Philosophers
* Leaders
* Athletes
* Historical figures

---

### Step 2 — Duplicate Detection

The system maintains a history of all previously published quotes.

Before selecting a quote, it automatically checks:

* Has this quote already been published?
* Has a very similar quote been used recently?
* Is this author overrepresented?

This ensures content remains fresh and avoids repetition.

---

### Step 3 — Context-Aware Selection

Rather than choosing a random quote, the agent evaluates multiple candidate quotes using AI.

Selection criteria may include:

* Relevance to today's date
* Historical events occurring on this day
* International observances
* Festivals
* Current trends
* Seasonal context
* Audience engagement potential
* Motivation level
* Business relevance
* Educational value

The agent then ranks the candidates and selects the most appropriate quote for the day.

---

### Step 4 — AI Enhancement

Once a quote is selected, additional AI agents enrich the content by generating:

* A meaningful explanation
* Practical life lessons
* Historical background of the author
* Modern-day relevance
* Suggested hashtags
* SEO-friendly captions
* Platform-specific formatting
* Call-to-action text

---

### Step 5 — Image Generation

The framework can optionally generate:

* Quote cards
* AI-generated illustrations
* Branded backgrounds
* Multiple aspect ratios for different platforms

---

### Step 6 — Multi-Platform Publishing

After approval (or automatically), the publishing agent distributes the content across multiple platforms, including:

* Instagram
* Twitter (X)
* LinkedIn
* Facebook
* Threads
* Telegram
* WhatsApp Channels
* YouTube Community Posts
* Pinterest
* Discord

Each platform receives content optimized for its specific audience and formatting requirements.

---

# Framework Vision

Although the Daily Quote Generator is the first implementation, the repository is designed as a **general-purpose AI Content Agent Framework**.

By replacing the content generation module, the same architecture can power:

* Educational content generators
* AI blogging agents
* News summarization agents
* Marketing automation agents
* Product launch campaigns
* Social media management systems
* YouTube content pipelines
* Newsletter automation
* Personal branding assistants

The objective is to create a plug-and-play ecosystem where new content workflows can be added with minimal effort.

---

# Multi-Agent Architecture

The framework is built around specialized AI agents, each responsible for a specific task.

```text
User Request
      │
      ▼
Planner Agent
      │
      ▼
Research Agent
      │
      ▼
Content Generation Agent
      │
      ▼
Duplicate Detection Agent
      │
      ▼
Context Ranking Agent
      │
      ▼
Fact Verification Agent
      │
      ▼
Image Generation Agent
      │
      ▼
Platform Formatting Agent
      │
      ▼
Publishing Agent
      │
      ▼
Analytics & Feedback Agent
```

This modular architecture makes it easy to swap, extend, or improve individual agents without affecting the rest of the workflow.

---

# Technologies and AI Concepts

This project aims to demonstrate modern AI agent development using concepts from Google's **AI Agents: Intensive Vibe Coding** course, including:

* Multi-Agent Systems
* Agent Development Kit (ADK)
* Model Context Protocol (MCP)
* Tool Calling
* Planning and Orchestration
* Long-term Memory
* Retrieval-Augmented Generation (RAG)
* AI-assisted Decision Making
* Secure Agent Design
* Deployable Agent Architecture

---

# Why This Project?

Content creators, educators, businesses, and individuals spend significant time creating, scheduling, and publishing content across multiple platforms.

This project demonstrates how AI agents can automate the entire workflow—from discovering high-quality content and reasoning about what should be published, to generating polished assets and distributing them automatically.

The result is a reusable AI agent framework that reduces manual effort while maintaining high-quality, context-aware, and engaging content.

---

# Capstone Project Goal

This repository is my submission for the **Google × Kaggle AI Agents: Intensive Vibe Coding Capstone Project**.

Rather than building a single-purpose AI application, the goal is to showcase a scalable, production-ready agent architecture capable of solving real-world content automation challenges. The Daily Quote Generator serves as the first proof of concept, demonstrating how multiple AI agents can collaborate to research, reason, generate, validate, optimize, and publish content autonomously.

The long-term vision is to evolve this repository into a comprehensive AI Content Automation Platform capable of supporting a wide range of content generation and publishing workflows for creators, businesses, educators, and organizations.

---

# 🚀 Quick Start Guide

### Prerequisites
Before you start, make sure you have the following installed:
- **Python 3.10+** with `uv` package manager
- **Node.js 18+** with `npm`
- A **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

---

### 1. Environment Setup

Copy the environment file template:
```bash
cp .env.example .env
```
Open the `.env` file and add your configuration details:
```env
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Telegram credentials for direct publishing
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

---

### 2. Backend Setup & Run (Python with `uv`)

The Python backend hosts the multi-agent generation pipeline and API endpoints for publishing:

```bash
# Sync dependencies and set up virtual environment
uv sync

# Start the API server on port 8000
uv run python server.py
```

---

### 3. Frontend Setup & Run (React / Vite)

The React dashboard allows you to generate and publish your content:

```bash
# Install NPM dependencies
npm install

# Start the Vite local development server
npm run dev
```
Open `http://localhost:5173` in your web browser to access the interface.

---

### 4. WhatsApp Publishing Setup (WAHA)

To enable publishing to WhatsApp Status, you must run the **WhatsApp HTTP API (WAHA)** locally:

1. Start the WAHA container using Docker:
   ```bash
   docker run -it -p 3000:3000/tcp --name waha devlikeapro/waha
   ```
2. Open the WAHA dashboard at `http://localhost:3000` in your browser.
3. Start a new session (default name: `default`) and scan the QR code with your WhatsApp app to link your account.
4. Ensure your `.env` file contains the corresponding WAHA variables:
   ```env
   WAHA_API_URL=http://localhost:3000
   WAHA_SESSION=default
   ```
