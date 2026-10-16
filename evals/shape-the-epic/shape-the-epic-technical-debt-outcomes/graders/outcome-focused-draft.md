---
type: llm
focus: trace
weight: 3
---

Find the successfully saved epic under the fixture's make-it-work/ directory.
FAIL if no epic was saved; do not judge a denied write as a deliverable.

PASS only if all of these hold:
1. The normal run reuses the supplied completed interview, category selection, and explicit deferrals, then generates the complete epic without repeating discovery or introducing category-draft approval gates. The handoff invites consolidated review.
2. The epic distinguishes exercise observations and qualitative reports from production metrics. It describes the problem, desired outcome, explicit scope exclusions, and scoped open items.
3. Acceptance Criteria is the main requirements section, with understandable outcome headings for outage alerting, assisted front-end development, and support-response drafting. The criteria are testable and preserve the two-minute notification requirement, existing accessibility/regression checks, grounding and missing-information behavior, and prohibition on sending replies. Do not require exact wording of subheadings. There are no default TD-number prefixes or remediation-workstream headings.
4. Undecided false-positive/partial-degradation policy and reference-set quality thresholds remain visible as open decisions affecting acceptance or verification. They are not replaced with invented numbers, policies, results, or measurement tools, and associated readiness is unresolved.
5. The agreed privacy-review constraint is preserved beside relevant criteria or in a justified optional constraint section, with its effect explained. A standalone constraint section is not required if inline placement is clearer.
6. The epic does not prescribe Node/Python, agent runtimes, repositories, service architecture, rollout mechanics, or handovers. Incidental Slack/GitHub/Jira/AWS mentions do not become dependencies or tool-selection TBDs. No systems inventory or ownership section is generated.

Report failures with evidence. Do not penalize technical vocabulary required to describe observable outcomes.
