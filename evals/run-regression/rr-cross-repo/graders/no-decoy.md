---
type: llm
focus: last_message
weight: 2
---

The fixture contains `qa-automation/tests/payments/limits_decoy.test.js`,
tagged `payments-api:UC-080`. It must not be selected for the requested
`payments-api:UC-08` (the id's trailing-digit boundary excludes `UC-080`).

PASS only if no `Suite(s) run:` line, and no other list of files or
commands the report says it ran, includes `limits_decoy`. FAIL if any of
them does.
