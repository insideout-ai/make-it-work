---
type: llm
focus: last_message
weight: 2
---

Judge the final handoff for the complete draft.

PASS only if ALL of the following hold:
1. It identifies the saved epic so the user can review the whole artifact and provide consolidated comments, without requesting section-by-section approval.
2. It identifies material open decisions if any remain, without implying human sign-off. It reports the actual self-answered Part A count (0–6) and whether discovery exited early or reached the cap, consistent with the trace.
3. It reports whether the autopilot decision log was saved or its write was denied.

List any failures with evidence. Do not require a particular sentence or word count.
