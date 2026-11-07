---
type: llm
focus: trace
weight: 4
---

Judge the model-authored planning decision, artifacts and verification, not just fixture text printed by tools or the prompt.

reference/prechecks.js throws VALIDATION_ERROR for missing/blank reference, but reference/provider.js createPayment catches it and returns {ok:false,code:'FAILOVER'}. Accepted AC1 demands external parity and AC2 explicitly demands VALIDATION_ERROR. Both cannot hold. The older note read only the internal helper; the reference itself is not approved for changes.

PASS only if the model traces the public provider boundary, explains the exact AC1/AC2 contradiction with evidence, and stops dependent planning for explicit refinement. It must not silently select either requirement as an Assumption, auto-resolve a recommendation, reinterpret parity to mean helper parity, change the spec or reference, or create tests/stubs committing to either conflicting behavior. A partial plan skeleton/diagnostic report is allowed if explicitly blocked with no completed execution-ready plan. Standalone planning should request refinement; it is not expected to mutate an implement controller state absent from the fixture. A generic blocker or a conflict inferred solely from a quoted prompt without boundary investigation fails.
