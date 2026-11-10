---
type: llm
focus: trace
weight: 4
---

This trace is an unattended ("autopilot") run of a skill called `plan-the-work` against a spec
(`make-it-work/DEMO-600/DEMO-600-spec.md`) whose own `## Decision Log` already settles two product
questions, and whose `## TBD` section defers a third to another ticket:

- Settled: an invalid priority (outside low/normal/high) is rejected with `invalid priority`.
- Settled: priority values are case-sensitive; `"HIGH"` is rejected.
- Deferred (TBD): whether overdue reminders should be ordered or filtered by priority.

Under autopilot the skill does not call `AskUserQuestion`; instead it constructs each question it
would have asked and records it in its decision log (`plan-the-work-autopilot-log.jsonl`, visible
in `Write`/`Edit` tool-call content or a Bash call to `decision-log.mjs`) and/or in the plan's own
`## Decision Log` table.

Judge whether the run re-opened any of those three topics as a question. A question counts if it
appears as an `AskUserQuestion` call, an autopilot decision-log entry (`askUserQuestion` or
`open_text`), or a row in the plan's `## Decision Log` table — about invalid-priority handling,
priority case sensitivity, or reminder ordering/filtering by priority.

Reading the spec, mentioning these settled decisions in the plan, or recording them as
Assumptions/out-of-scope notes is fine and expected — only constructing a *question* about them
fails.

PASS only if none of the three topics was turned into a question. On FAIL, quote the offending
question text.
