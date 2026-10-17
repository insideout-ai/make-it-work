---
type: llm
focus: trace
weight: 1
---

This is the full transcript of a `slice-the-epic --autopilot` run against a well-specified epic (CSV export of a customer's own order history) with five clear acceptance criteria. The backlog may appear in an earlier assistant turn than the final summary — judge the whole transcript.

PASS if the backlog is delivered without the assistant asking the user a question and waiting for an answer, and no backlog decision is qualified with `[autopilot best-guess]` (naming the marker only to say it was not used is fine). Noting a non-blocking open question, assumption, or "product decision to confirm" is not a clarifying question and must PASS. FAIL only if the assistant asks the user something and stops before delivering the backlog, or qualifies a decision with the marker.
