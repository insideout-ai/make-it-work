---
type: llm
focus: trace
weight: 3
---

Judge the successfully saved epic under the fixture's make-it-work/ directory.
FAIL if no epic was saved.

PASS only if all of these hold:
1. The run resolves focus selection and discovery unattended, then generates the complete draft directly without a category-draft approval round. It does not ask a human to answer questions, and it invites consolidated review. Interview questions do not invent answers absent from the source.
2. The epic identifies the qualitative CI-delay problem, desired faster feedback while retaining check effectiveness, outcome-based acceptance criteria, scope boundaries, and open items. Missing baseline duration, target threshold, and representative workload are scoped TBDs explaining their effect on verification; the epic is not labeled fully ready or human-approved.
3. No numerical targets, measured results, new tooling, caching/parallelization plan, runner architecture, repository inventory, rollout plan, or maintenance commitments are invented. Existing required checks can be described as part of the outcome; that does not justify a systems inventory.
4. There is no standalone Technical Constraints & External Dependencies section, systems/ownership table, or checklist blocker for those omitted sections. GitHub and Slack do not become dependency entries. No one is assigned responsibility, and missing responsibility is not an open item.
5. Omitted implementation decisions are not manufactured open items, and absence of information does not become a declared exclusion. An empty exclusions list is acceptable.

Report failures with evidence rather than requiring exact phrasing.
