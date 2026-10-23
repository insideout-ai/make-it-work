---
type: llm
focus: last_message
weight: 2
---

The fixture contains `qa-automation/tests/payments/limits_decoy.test.js`,
which asserts a UC-080 daily-report list length, not a UC-08 withdrawal.
It must not be selected for the requested `payments-api:UC-08`.

PASS only if no `Suite(s) run:` line, and no other list of files or
commands the report says it ran, includes `limits_decoy`. FAIL if any of
them does.
