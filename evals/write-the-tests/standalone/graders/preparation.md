---
type: llm
focus: trace
weight: 3
---

PASS only if the agent reads the approved plan/spec and applicable guidance, writes unittest coverage in tests/test_discount.py, actually runs supported scoped checks, observes passing positive/zero regression cases and a negative progression failing because ValueError is not raised, and saves a preparation report plus revision-bound JSON through preparation.mjs. It must leave src/discount.py and the plan's approved contents and Progress unchanged. Reuse one test file for both scenarios without conflating their results. An import/discovery/type error is not expected red. No generated strategy/map is needed. Do not infer correctness from claimed results without tool evidence. Returning just a plan or starting production implementation fails.
