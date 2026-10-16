---
type: llm
focus: trace
weight: 3
---

`payments-api`'s behavior tests live in the sibling repo `qa-automation`
(`qa-automation/tests/payments/withdraw.test.js` requires
`../../../payments-api/src/withdraw.js` and exercises `/payments`). The run
either wrote `payments-api/.claude/skills/test-strategy/SKILL.md` or, when
that write was denied or failed, printed the generated skill in chat. Either
is fine.

Look for the confirmed locations in any of these: the `## Test Locations`
table in a `TOOL` call that writes that skill file, the `## Test Locations`
table printed in `ASSISTANT:` or `FINAL:` text, or the locations listed in
the `FINAL` summary.

Answer PASS only if they include `.` for `payments-api` and at least one
other location starting with `../qa-automation` whose repo is
`qa-automation`. Answer FAIL otherwise.
