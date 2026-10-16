---
type: llm
focus: last_message
weight: 2
---

This run does not request --autopilot. Phase 4 requires presenting the draft
shortlist with an assessment-evidence table, saving a pending draft, and waiting
for explicit confirmation before saving the final report.

Judge whether this final message reads as a genuine, unanswered checkpoint — it presents a draft
shortlist and waits for the user to confirm or adjust it. A saved pending draft
is expected; that must not be confused with a confirmed final report.

PASS if it links the pending draft, presents the table, and has one pending
confirmation (plain text or structured). FAIL if it claims final confirmation,
omits the table, or opens optional owner/external side questions instead of
keeping that one confirmation pending.
