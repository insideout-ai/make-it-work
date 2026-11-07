---
type: llm
focus: { source: file, path: "make-it-work/ASSUME-1/ASSUME-1-plan.md" }
weight: 4
---

This fixture's authoritative docs/provider-contract.md explicitly establishes API v2 duplicate suppression for identical merchant/key/payload within 24 hours, including concurrent replay after a response timeout. The wrapper pins v2; the spec's retry window is below one minute and preserves the key and payload. PASS only if the agent cites that actual evidence and its relevant scope in the plan and proceeds with an implementation plan consistent with those constraints. Planned local tests may verify the wrapper, but should not be presented as independently establishing provider behavior. FAIL if the plan invents a guarantee without inspecting evidence, blocks on unavailable sandbox credentials or provider confirmation despite the sufficient accepted contract, creates a redundant mandatory validation stage, or permits retries outside the documented scope. Normal implementation verification remains appropriate.
