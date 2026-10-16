---
type: llm
focus: trace
weight: 3
---

This is a normal run without `--autopilot`, with detailed Saved Search Alerts context but no selected mode or review categories. The interview and focus selection remain part of the normal workflow.

PASS only if ALL of the following hold:
1. The run asks for the missing mode or review-scope choice, or a relevant discovery question, and waits for the user rather than self-answering.
2. It does not save or present a complete epic before the outstanding selection/interview steps are resolved.
3. It does not show drafted category content for Accept/Refine/Replace approval. Selection and discovery questions are allowed and expected; they are not the removed post-interview confirmation round.

List any failures with evidence.
