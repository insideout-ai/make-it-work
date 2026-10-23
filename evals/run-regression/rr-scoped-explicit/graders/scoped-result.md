---
type: llm
focus: last_message
weight: 3
---

This is a trace of `run-regression --autopilot velocity-app:domain-velocity`,
invoked from a workspace root whose one repo `velocity-app` has two domains
(`billing`, `velocity`). Its `.claude/skills/test-strategy/SKILL.md` lists one
location `.` with `Test files` `test/*.test.js`, command `npm run test` and
`Local run: yes`. Temporary evidence-backed discovery must confirm that
`test/sprint.test.js` asserts velocity behavior,
`test/invoice.test.js` asserts billing behavior, and
`test/notes.test.js` checks only release-note formatting. Every test passes. Only
`velocity-app:domain-velocity` was requested, so the expected run is
`npm run test -- test/sprint.test.js`, run from `velocity-app`.

The expected final report has this shape (blank lines and exact spacing may vary):

```
Workspace: 1 runs
Mode: Scoped

Repo: velocity-app
Mode: Scoped
Suite(s) run: npm run test -- test/sprint.test.js
Gate result: PASS

Not run: None
Unmapped scope (not run): None
Overall gate result: PASS
```

Judge whether the final response satisfies ALL of the following:

1. It starts the report with a `Workspace: 1 runs` line followed by a leading `Mode: Scoped` line (not `Full suite`, not `Scoped + full`).
2. Exactly one run block is printed, with `Repo: velocity-app` and `Mode: Scoped`.
3. That block's `Suite(s) run:` names `npm run test -- test/sprint.test.js` (or an equivalent command that runs ONLY `test/sprint.test.js`, from `velocity-app`), and does NOT reference `test/invoice.test.js` or `test/notes.test.js`.
4. That block's `Gate result: PASS`, with no `Reason:`.
5. `Not run: None`.
6. `Unmapped scope (not run): None`.
7. A closing `Overall gate result: PASS` line.

PASS only if all of 1-7 hold. List any that fail.
