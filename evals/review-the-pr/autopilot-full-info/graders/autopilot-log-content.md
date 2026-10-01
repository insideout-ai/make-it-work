---
type: llm
focus: { source: file, path: ".claude/review-the-pr-autopilot-log.jsonl" }
weight: 3
---

This file should be a JSONL log (one JSON object per line) of autopilot
decisions made while running a skill called `review-the-pr`, invoked WITH a
PR link and WITH requirements text supplied up front (a PR link
`https://github.com/example-org/mini-task-tracker/pull/7` and a short
requirements paragraph about clearing `assignedTo` on completion). Each line
has fields `phase`, `site`, `kind` (`open_text` or `checkpoint`), `chosen`,
and `rationale`.

Judge whether the log satisfies ALL of the following:

1. Every line is valid JSON with at least `phase`, `site`, `kind`, `chosen`, and `rationale`.
2. There is a line for the PR-link site reflecting that the link was already provided in the invocation (not a "no PR yet" resolution, and not a fabricated different URL).
3. There is a line for the requirements site reflecting that requirements text was already provided in the invocation (not a ticket-fetch/inference fallback).
4. There is a line for the branch-pair confirmation site (`kind: "checkpoint"`) whose `chosen` names a source and destination branch consistent with `feature/TASK-100-clear-assignee-on-complete` (source) and `main` (destination) — this site still fires even though a PR link was given, per the skill's "Always ask — even when a PR link is provided" rule.
5. No line fabricates information that wasn't actually given.

PASS only if all of 1-5 hold. List any that fail.
