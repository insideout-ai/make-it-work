---
type: regex
target: { source: file, path: "qa-automation/tests/payments/withdraw_ledger.test.js" }
pattern: "payments-api:"
match: not_contains
weight: 3
---

`withdraw_ledger.test.js` exercises only `ledger-api`, so it must not receive a
`payments-api:` annotation even though it shares the UC-08 number.
