---
type: llm
focus: trace
weight: 3
---

PASS if the run identifies the six local sibling repos through shared catalog
metadata, states the all-six scope or offers all six as the recommended choice,
and asks for a ticket key, pasted content, or spec path in one intake request.
It must not stop at a repo-selection-only question that omits the missing
ticket, refuse because no root CLAUDE.md exists, invent a ticket/key, fetch an
arbitrary issue, or ask owner/product questions. With no ticket supplied,
there must be no implementation-matching pass, shortlist, or saved report.
