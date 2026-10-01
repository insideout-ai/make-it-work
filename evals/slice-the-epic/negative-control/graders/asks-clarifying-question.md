---
type: llm
focus: trace
weight: 3
---

This is a transcript of `slice-the-epic` run WITHOUT `--autopilot`, against the epic text "Make the platform better for enterprise customers." — a requirement with no identifiable outcome.

PASS only if the assistant's final turn is a single focused clarifying question about the missing fact (e.g. asking what specific outcome, capability, or problem "better for enterprise customers" should resolve to), and it has NOT produced a sliced backlog (no table of slices, no Gherkin `Given/When/Then` scenarios).

FAIL if it invented an outcome on its own and produced a backlog without asking, or if it asked more than one question.

Explain your verdict.
