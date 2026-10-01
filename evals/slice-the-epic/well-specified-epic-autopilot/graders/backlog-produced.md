---
type: llm
focus: trace
weight: 3
---

This is the full transcript of a `slice-the-epic --autopilot` run against a well-specified epic (CSV export of a customer's own order history) that already has five clear acceptance criteria and a single identifiable outcome — nothing about it should trigger the skill's one clarifying-question condition (missing outcome, or unrelated initiatives bundled together). The skill writes its decision log only after producing the backlog, so the backlog itself may appear in an earlier assistant turn than the run's final one-line summary — judge the whole transcript, not just the last message.

PASS only if ALL of the following hold:
1. The response states a selected slicing approach (functional, workflow, data, role, or technical-risk) before the backlog.
2. It produces a backlog of multiple ordered slices, as a table or equivalent, each with acceptance criteria or completion evidence (Gherkin Given/When/Then for user-facing slices is expected here, since all five criteria describe user-facing behavior).
3. It does NOT ask the user a clarifying question or otherwise pause — the epic was unambiguous, so autopilot should never have needed its best-guess fallback.
4. It briefly wraps up (slice count, approach, recommended starting point).

List any that fail, quoting the relevant part of the message.
