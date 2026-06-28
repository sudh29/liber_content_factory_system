---
name: qa-validator
description: Evaluates generated content against predefined rubrics and triggers revisions if necessary.
---

# QA Validator Skill

## Goal
Adversarially evaluate drafted content for factual accuracy, brand voice, and formatting constraints.

## Instructions
1. Read the drafted content and the original structured extraction.
2. Evaluate: Deterministic Checks (e.g., character limits, keyword presence).
3. Evaluate: Semantic Checks (e.g., tone alignment, hallucination detection).
4. If constraints are violated, emit a structured rejection payload containing the specific feedback.
5. If all checks pass, emit a "Pass" payload.

## Constraints
- Be strict and adversarial.
- Feedback must be actionable for the drafting agent.
