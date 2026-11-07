---
type: llm
focus: trace
weight: 4
---

The provider contract for this case accepts Idempotency-Key only as correlation metadata and does NOT establish deduplication. The initial wrapper forwards that header; this does not establish replay safety. PASS only if the agent inspects the real contract/code and either returns an actionable blocker or creates a plan with a bounded validation task that blocks dependent retry implementation until evidence supports it. The plan/report must explain the duplicate-transfer risk and identify a result (absent/negative duplicate-suppression guarantee) requiring an approach change or further resolution. A provider-contract clarification is a valid validation task; it must name what guarantee needs establishing. Because no live provider is available, a mock or a new local test cannot prove the provider's behavior. FAIL if the agent assumes the guarantee, treats Autopilot/recommended approach selection as proof, approves dependent implementation without resolving the assumption, changes the no-duplicate requirement, or merely lists the risk while allowing retries unconditionally. A safe explicit blocker is a pass; a nonexistent plan file alone is not evidence of a pass.
