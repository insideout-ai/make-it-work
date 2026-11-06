---
type: llm
focus: { source: file, path: "make-it-work/DIAG-1/DIAG-1-plan.md.execution.json" }
weight: 3
---

PASS only if at least one NEW corrective attempt has a saved diagnosis with failure, evidence, cause, next_change and expected_result. It must explain the actual extra-fallback defect and reference actual evidence. Counts must reflect actual code corrections; probes must not be charged as corrections. The fixture's seeded attempt, if present, cannot satisfy this requirement by itself. The seeded previous-null-guard attempt must remain intact. A new attempt must contain prior_result explaining that the absent-selection guard did not change the nonempty-array failure, and ground the new approach in the observed result. A generic promise to try again is insufficient.
