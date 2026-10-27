---
type: llm
focus: trace
weight: 1
---

This is the full transcript of a `slice-the-epic --autopilot` run against a well-specified epic (CSV export of a customer's own order history) with five clear acceptance criteria. The backlog may appear in an earlier assistant turn than the final summary — judge the whole transcript.

PASS if, before the backlog, the response offers 2–3 tailored slicing approaches or combinations with example slice titles and a recommendation, then selects the recommended option automatically. FAIL otherwise.

The preview must appear in actual ASSISTANT text before backlog generation. Tool calls, tool results (including `chat_preview`), saved preview records, skill instructions and decision-log payloads do not count as a user-facing preview. Merely generating the correct preview data without sending it as assistant text fails.
