---
type: llm
focus: trace
weight: 4
---

Judge model-authored artifacts and decisions, not only seeded facts printed by tools.

The prior PM questions message is confirmed sent. Its last saved check found no replies; the current fixture has no live Slack. The user already explicitly chose to resolve Q1 and Q2 live: truncate to 100 and warn, CSV-only. The user's role and separate PM approval were not established. No resolution FYI was sent. Invocation uses --autopilot but neither recorded answer is automatic.

PASS only if the final spec is saved and contains the two recorded user decisions with user/live attribution. A short Product communication note must appear near the top of the spec (before its main requirement sections) AND in the final response, explaining local user resolution versus PM response, the last-known sent/no-reply state or unavailable fresh lookup, and no sent follow-up. Do not require pretending to know the current thread state: saying replies cannot be checked now is correct. Do not mark the PM as having approved, unanswered Slack questions as replied-to, or the thread as closed. Do not label user answers Autopilot. Do not create a new mandatory PM gate or call the decisions pending PM confirmation absent an explicit policy. Questions-file delivery metadata must retain confirmed sent status, timestamp and recipient even when local refinement completes. Status Answered/superseded is allowed and must not be treated as PM reply evidence. No Slack send/draft/FYI or external publication is permitted.
