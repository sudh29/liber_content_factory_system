---
name: linkedin-hook-generator
description: Analyzes technical blog posts and generates engaging, algorithm-optimized LinkedIn hooks. Use this when asked to write social media copy.
---

# LinkedIn Hook Generator Skill

## Goal
Generate highly engaging, algorithmic-optimized LinkedIn hooks based on technical long-form content.

## Instructions
1. Analyze the provided long-form content.
2. Run the `scripts/text_analyzer.py` script to identify key technical terms and sentiment.
3. Draft a hook that uses an intriguing statement or question to draw the reader in.
4. Keep the hook under 200 characters to ensure it is visible before the "See more" button.

## Constraints
- Never output raw user passwords or API keys.
- Do not use emojis in the first sentence.
- Always include a call to action.

## Examples
**Input:** "This report details the comprehensive design and implementation plan for the 'Content Factory,' an enterprise-grade multi-agent system..."
**Output:** "Tired of context rot and tool bloat in your AI agents? Discover how the 'Content Factory' architecture utilizes a strict Orchestrator-Worker paradigm to solve complex workflows."
