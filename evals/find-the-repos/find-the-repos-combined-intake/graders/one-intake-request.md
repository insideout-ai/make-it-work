---
type: llm
focus: trace
weight: 3
---

PASS if the run identifies the six local sibling repos through shared catalog
metadata, states that all six will be assessed by default, and asks only for
the missing ticket key, pasted content, or spec path in one intake request.
It must not ask for all-versus-subset approval (in chat or AskUserQuestion),
turn ticket input into a multiple-choice method-selection round, refuse
because no root CLAUDE.md exists, invent a ticket/key, fetch an
arbitrary issue, or ask owner/product questions. With no ticket supplied,
there must be no implementation-matching pass, shortlist, or saved report.
