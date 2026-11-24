---
type: llm
focus: trace
weight: 1
---

Inspect model-authored plan and reasoning, not fixture text merely printed. Require production correction steps for (1) transfer validation errors incorrectly emitting FAILURE and (2) preview emitting SUCCESS while generation is pending or after it rejects. Scenarios must drive real validation/error conversion through transfer, and observe outgoing events for delayed/rejected preview generation. Mocking storage, preview service and event delivery is appropriate; mocking the whole upload operation cannot prove its validation behavior. The requirement covers directUpload AND transfer; the direct path's passing refusal test cannot certify the sibling. Preserve blocked-extension silence and actual storage-failure emission as controls. Preserve adequate existing code/tests; no arbitrary new scope, extra approval or requirements rewrite. Fail on docs-only work, generic test-count/coverage claims, omitted defect, or implementation during planning. Existing behavior may be covered with passing tests honestly; no mandatory document/table/wording is required.
