---
type: llm
weight: 3
---

This is a trace of `run-regression --autopilot domain-velocity` against a
fixture with two domains (`billing`, `velocity`), each with one passing
test file (`test/domain-billing.test.js`, `test/domain-velocity.test.js`),
and a `.claude/rules/testing-strategy.md` recording the full-suite command
`npm run test`. Only `domain-velocity` was requested.

Judge whether the final response satisfies ALL of the following:

1. `Mode: Scoped` is reported (not `Full suite`).
2. `Suite(s) run:` names a command that runs ONLY `test/domain-velocity.test.js` — it must reference `npm run test` (or equivalent) with that file appended, and must NOT reference `test/domain-billing.test.js`.
3. `Gate result: PASS` (both domains' tests actually pass, so the scoped run should pass too) with no `Reason:`.
4. `Unmapped scope (not run): None`.

PASS only if all of 1-4 hold. List any that fail.
