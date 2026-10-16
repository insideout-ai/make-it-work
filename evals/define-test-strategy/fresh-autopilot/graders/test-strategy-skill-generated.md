---
type: llm
focus: { source: file, path: ".claude/skills/test-strategy/SKILL.md" }
weight: 3
---

This file did NOT exist before this run; `define-test-strategy` generated it
from scratch for a single-repo Node.js project whose only test tooling is the
built-in `node --test` runner (`package.json`'s `test` script is
`node --test`), with go-deep already run (use cases UC-01 to UC-04).

Judge whether the file satisfies ALL of the following:

1. It contains these eight `##` headings, in this order, each exactly once: `## Repo ID`, `## Test Locations`, `## Layers`, `## Run Prerequisites`, `## Where New Tests Go`, `## Coverage Decision Guidance`, `## Tag Convention`, `## How to Scan`.
2. It has no `## Pending` heading (go-deep has run, so this is not a partial run).
3. The first data row of the `## Test Locations` table has Location `.`.
4. That row's full-suite command is `npm test`, `npm run test` or a `node --test` command (any of these runs `node --test`).
5. It contains no stored list of coverage gaps or uncovered use cases (for example no "Uncovered", "Gaps" or "Coverage" list naming UC-01 to UC-04 as missing).

PASS only if all of 1-5 hold. List any that fail.
