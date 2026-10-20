---
type: llm
focus: trace
weight: 3
---

The repo has JavaScript business logic and go-deep use cases but no configured
test tooling or tests. Judge the generated strategy, whether written at
`.claude/skills/test-strategy/SKILL.md` or printed in full when writes there are
blocked: its Test Locations row must have none for layers/files/command.
Selected layers must appear in Layers as planned or deferred (not configured),
with Example command none; Where New Tests Go must carry matching statuses and
intended placement or explicit TBD. Coverage guidance must identify setup needed
for selected layers. Plain None is correct only if no layer was selected. Do not
accept omission of a selected layer merely because tooling is absent. A
Recommended Setup section must propose a concrete initial runner/layer, explain
the fit using repo evidence, name proposed setup changes/commands/placement,
prioritize real use-case or failure-path coverage, and identify a first real
behavior test. Proposed commands must remain visibly unverified. Do not require
a particular framework or exact wording. FAIL for a generic "add a runner"
sentence without an actionable repo-specific proposal.

The generated strategy must also record Strategy Decisions: chosen layers and
why they fit, real/mocked boundaries, execution approach, first tests with
expected observations, deferred work and assumptions. Defaults must be labeled
as autopilot choices rather than user agreement. Do not require multiple layers
for this small pure-function repo. FAIL if it simply picks a runner without
developing the testing approach.
