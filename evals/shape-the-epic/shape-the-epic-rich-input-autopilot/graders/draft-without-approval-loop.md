---
type: llm
focus: trace
weight: 3
---

This run supplies detailed context for Saved Search Alerts. Autopilot resolves mode/focus selection and discovery unattended, then generates a complete draft without the removed section-approval round.

PASS only if ALL of the following hold:
1. Mode/focus selections are resolved according to the autopilot policy. Discovery reuses the rich supplied context, including an immediate early exit when it already covers the selected areas; unnecessary repeated interview questions are not required.
2. After interview/gap-check and internal analysis, the complete epic is saved directly. The transcript does not construct per-category Accept/Refine/Replace payloads, show category proposals for approval, or narrate automatic acceptance of every section. Category-selection and discovery payloads are valid and expected when unresolved.
3. No tool call asks a human to resolve a question.
4. The draft and final handoff do not claim human approval. A brief internal coverage check or a concise progress update is fine; it is not an approval loop.

List any that fail, quoting the relevant evidence.
