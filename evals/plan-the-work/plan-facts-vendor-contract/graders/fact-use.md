---
type: llm
focus: trace
weight: 4
---

Judge the model-authored planning decision, artifacts and verification, not just fixture text printed by tools or the prompt.

The authoritative synthetic vendor snapshot is docs/vendor-create.md: success requires HTTP 2xx, body.status exactly REQUIRES_ACTION, and nonempty string payment_id. Other statuses, malformed/missing fields or body, and non-2xx are PROVIDER_ERROR. Research notes point to that snapshot; the accepted spec incorporates it rather than repeating every detail.

PASS only if the model produces an actionable plan and verification covering all three success predicates and the error cases. The body-status fact must reach affected implementation steps and concrete tests/scenarios; merely reading/quoting the doc or mentioning generic validation is insufficient. A happy-path-only plan or 2xx-as-success test fails. Evidence references can use existing Assumptions/Risks/step sections: no dedicated ledger or fact IDs are required. Do not require speculative credential/network testing: the accepted task is a pure response mapper. A source-backed contract already exists, so a mandatory external verification gate or generic refusal fails unless another actual blocker is evidenced.
