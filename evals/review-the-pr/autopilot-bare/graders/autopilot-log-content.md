---
type: llm
focus: { source: file, path: ".claude/review-the-pr-autopilot-log.jsonl" }
weight: 3
---

This file should be a JSONL log (one JSON object per line) of autopilot
decisions made while running a skill called `review-the-pr`, invoked with NO
PR link and NO requirements supplied up front. Each line has fields `phase`,
`site`, `kind` (`open_text` or `checkpoint` — this skill never uses
`askUserQuestion`), `chosen`, and `rationale`.

Judge whether the log satisfies ALL of the following:

1. Every line is valid JSON with at least `phase`, `site`, `kind`, `chosen`, and `rationale`.
2. There is a line for the PR-link site (`kind: "open_text"`) whose `chosen` reflects that no PR link was available — something to the effect of "no PR yet" / proceeding without a PR link — NOT a fabricated URL.
3. There is a line for the requirements site (`kind: "open_text"`) whose `chosen` reflects that no requirements were supplied directly, and that it fell through to ticket-fetch and/or branch/commit inference.
4. There is a line for the branch-pair confirmation site (`kind: "checkpoint"`) whose `chosen` names a source and destination branch consistent with `feature/TASK-100-clear-assignee-on-complete` (source) and `main` (destination).
5. No line fabricates a PR URL that wasn't actually given.

PASS only if all of 1-5 hold. List any that fail.
