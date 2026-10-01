---
type: llm
focus: last_message
weight: 3
---

This is the final message of a `shape-the-epic` run **without** `--autopilot`, given the same rich "Saved Search Alerts" epic idea used in the autopilot fixture.

PASS only if ALL of the following hold:
1. The message asks the PM a question (either a plain-text Phase 2 Part A opening question, or a structured `AskUserQuestion`-style numbered-option presentation) rather than presenting a finished epic.
2. The message does not contain epic deliverable content — no "## What & Why", "## Decision Log", or "Readiness Checklist" sections.
3. The message does not claim to have saved any file under `make-it-work/`.

List any of 1-3 that fail, quoting the relevant text.
