---
name: context-extractor
description: Extracts structured goals and themes from messy, unstructured raw data (e.g., transcripts).
---

# Context Extractor Skill

## Goal
Convert unstructured raw input into a strictly validated Pydantic JSON structure containing core arguments, supporting evidence, and knowledge gaps.

## Instructions
1. Analyze the raw input text.
2. Identify the main thesis (core_arguments).
3. Extract any data points or quotes that support the thesis (supporting_evidence).
4. Identify any topics mentioned that lack sufficient detail or require external verification (knowledge_gaps).
5. Output the result STRICTLY as JSON matching the required schema.

## Constraints
- Output must be parseable JSON.
- Do not include conversational filler like "Here is the JSON."
