---
type: llm
focus: { source: file, path: "make-it-work/define-test-strategy-autopilot-log.jsonl" }
weight: 3
---

This file should be a JSONL log (one JSON object per line) of autopilot decisions made while running `define-test-strategy` in **fresh** mode (case (a): nothing existed before this run, so Phase 1's "Decide how to proceed" menu is never shown — fresh mode proceeds straight to Phase 2 with no site to log there) against a fixture with 4 use cases (UC-01 through UC-04), all uncovered before this run, and a `node --test` stack with no hook manager present.

Judge whether the log satisfies ALL of the following:

1. Every line is valid JSON with at least `phase`, `site`, `kind`, and `chosen` fields.
2. There is NO line with `site` naming the Phase 1 "decide how to proceed" menu — that site is never reached in fresh mode, so no log entry should exist for it.
3. There is a Phase 3 scaffold-confirmation line with `kind: "askUserQuestion"`, `multiSelect: true`, and `chosen` as a JSON array containing all 4 use cases (UC-01 through UC-04) — fresh mode means all 4 are uncovered, and autopilot selects every surfaced use case.
4. There is a Phase 4 line choosing to show the coverage report (`chosen` naming something like "Show coverage gaps now").
5. There is a Phase 5 hook-offer line whose `chosen` is "No hook — CLAUDE.md instruction is enough" (or textually equivalent) — never "Also scaffold a real git hook".
6. No line anywhere has `chosen` equal to "Also scaffold a real git hook" or any value indicating a hook file was written.

PASS only if all of 1-6 hold. List any that fail, quoting the relevant line(s).
