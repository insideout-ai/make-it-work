---
type: llm
focus: { source: file, path: "make-it-work/DEMO-700-summary-comment.md" }
weight: 3
---

PASS if the prepared source-ticket comment contains a readable summary table covering all three slices, preserving each outcome, hard prerequisite, recommended predecessor, and stage from the supplied saved summary. S-1 must have no prerequisites and stage 1, S-2 must have hard prerequisite S-1 and stage 2, and S-3 must have no hard prerequisites but recommend following S-1 at stage 2. The comment must include the confirmed DEMO-701 ticket link for S-1 and distinguish its confirmed parenting under DEMO-700 from S-2's failed creation and S-3's pending mandatory value. It must not fabricate tickets for S-2/S-3, omit unsuccessful slices, convert recommended order into a blocker, or contain unusable local Markdown/file links. Plain stable slice IDs are appropriate. FAIL otherwise.

Creation outcomes may remain in the overview's separate Jira creation results table; there is no requirement to collapse the whole document into one enriched summary table. For a slice without a confirmed Jira ticket, its local-link label and filename should be retained as readable text rather than a clickable local path.
