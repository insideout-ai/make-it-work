---
type: regex
target: { source: file, path: "qa-automation/tests/payments/withdraw.test.js" }
pattern: "@covers [^\\n]*payments-api:UC-08([\\s]|$)"
weight: 3
---

The QA repo's withdrawal test now carries a repo-qualified
`payments-api:UC-08` tag (not `UC-080`).
