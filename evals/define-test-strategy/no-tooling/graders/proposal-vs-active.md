---
type: llm
focus: { source: file, path: ".claude/skills/test-strategy/SKILL.md" }
weight: 3
---

The repo has JavaScript business logic and go-deep use cases but no configured
test tooling or tests. Judge the generated strategy: its active Test Locations
row must have none for layers/files/command, and active Layers, new-test targets
and coverage guidance must be plain None, with no proposed directories or
synthetic None table rows. A
Recommended Setup section must propose a concrete initial runner/layer, explain
the fit using repo evidence, name proposed setup changes/commands/placement,
prioritize real use-case or failure-path coverage, and identify a first real
behavior test. Proposed commands must remain visibly unverified. Do not require
a particular framework or exact wording. FAIL for a generic "add a runner"
sentence without an actionable repo-specific proposal.
