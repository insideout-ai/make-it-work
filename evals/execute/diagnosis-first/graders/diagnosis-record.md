---
type: llm
focus: { source: file, path: "make-it-work/DIAG-1/DIAG-1-plan.md.execution.json" }
weight: 3
---

PASS only if at least one NEW corrective attempt has a saved diagnosis with failure, evidence, cause, next_change and expected_result. It must explain the actual extra-fallback defect and reference actual evidence. Counts must reflect actual code corrections; probes must not be charged as corrections. This first-correction fixture starts with ZERO fix attempts and no saved diagnoses; it seeds only an active dispatch and failing verification output. Therefore the first recorded correction (including an ID such as step-1-fix-1) is NEW and can satisfy this requirement. Do not require a second correction or confuse a seeded dispatch with a seeded fix attempt.
