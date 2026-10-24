---
type: regex
target: { source: file, path: "qa-automation/tests/payments/withdraw.test.js" }
pattern: "@covers"
match: not_contains
weight: 3
---

The QA test is not annotated; the product-owned map must describe the relationship.
