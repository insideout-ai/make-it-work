---
type: llm
focus: { source: file, path: "make-it-work/go-deep-autopilot-log.jsonl" }
weight: 3
---

This file should be a JSONL log (one JSON object per line) of autopilot decisions made while running a skill called `go-deep`. Each line has fields: `phase`, `site`, `kind` (one of `askUserQuestion`, `checkpoint`, `open_text`), and `chosen` (plus `multiSelect`, `question`, `options` only when `kind` is `askUserQuestion`).

Judge whether the log satisfies ALL of the following:

1. Every line is valid JSON with at least `phase`, `site`, `kind`, and `chosen` fields.
2. Every line with `kind: "askUserQuestion"` has an `options` array with between 2 and 4 entries.
3. Among lines with `kind: "askUserQuestion"` AND `phase: "Phase 2"`: the last option's label is exactly `"Skip — clear from code"`, and the first option's label ends with `"(Recommended)"`.
4. Any line with `multiSelect: true` has `chosen` as a JSON array, not a plain string.
5. **At least one line has `kind: "askUserQuestion"` AND `phase: "Phase 2"`.** This is a hard requirement — if no such line exists, FAIL regardless of the other checks, since it means the fixture's deliberate ambiguity (whether this tiny project has one user role or two) never actually got exercised.
6. No line anywhere has `chosen` equal to `"Run fresh onboarding"`.

This fixture's source code is deliberately ambiguous about whether there are one or two distinct user roles (task creation treats the creator as "owner", reminder escalation checks for "admin", with nothing stating whether these are the same role or different ones) — a reasonable autopilot log should show a Phase 2 question addressing this ambiguity, among possibly others.

PASS only if all of 1-6 hold. List any that fail.
