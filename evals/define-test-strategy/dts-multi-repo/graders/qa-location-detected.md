---
type: llm
focus: { source: file, path: "payments-api/.claude/skills/test-strategy/SKILL.md" }
weight: 3
---

This test-strategy skill was generated for `payments-api`, whose behavior tests
live in the sibling repo `qa-automation` (`qa-automation/tests/payments/withdraw.test.js`
requires `../../../payments-api/src/withdraw.js` and exercises `/payments`).

Answer PASS only if the `## Test Locations` table has row 1 with Location `.`
for `payments-api`, and at least one other row whose Location starts with
`../qa-automation` and whose Repo is `qa-automation`. Answer FAIL otherwise.
