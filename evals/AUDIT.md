# Eval maintenance audit — 2026-11-13

## What this audit establishes

The catalog now exposes every discovered case's actual grader requirements,
skill, tier, retained disposition and maintenance follow-up. Run
`node evals/catalog.mjs --json` for the current inventory rather than copying
counts into documentation. This branch starts from main; feature PRs may add
cases independently and they automatically appear in extended/full.

The review found distinct scenario families (requirements authority, loading
gates, scope/branch consent, readiness, execution, review, resume, maintenance,
publication, delivery and feedback). File/state checks have deterministic helper
coverage as well as behavioral scenarios. Both can be useful: helpers validate
mechanics, model evals validate that the workflow invokes them correctly.

All cases are retained. Static inventory is not proof that each grader still
matches current behavior, and absence of a recent pass is not grounds to retire
a regression. No semantic duplicate or obsolete requirement has been established
strongly enough to delete a case. Consolidation/retirement therefore remains an
evidence-driven follow-up, not a blanket pruning operation.

## Initial maintained suites

Smoke remains one representative case per skill. Critical adds seven explicit
contracts: full TDD completion, lightweight completion, workspace consent,
execution resume, failed-gate stops, review obligations and epic review gates.
Their reasons are recorded in suites.json. Smoke alone was insufficient because
the implementation smoke case checks startup rather than completion.

Critical is a curated contract set, not a claim that an unrun case passed. Run
and record a complete critical baseline before using it to certify a release.
New or repaired cases enter blocking tiers only after reviewing their purpose,
fixture, evidence and current baseline. Extended remains available by skill and
stable shard; full still discovers every case. No recurring task was installed.

## Evidence-backed maintenance findings

- `autopilot-full-info`: the judge had only a decision log and rejected a file
  count that the successful Git discovery output supported. Repair: give the
  semantic judge the trace plus saved log; do not weaken the no-fabrication rule.
- `define-test-strategy-negative-control`: the grader required a testing-rule
  row missing from the fixture before the run. Repair: compare actual guidance
  with the fixture baseline deterministically; any edit still fails.
- `drive-the-epic-uncertainty-resolved`: a run added a confirmation requirement
  after a recorded product clarification. Investigate whether technical details
  improperly reopened that resolution. This is not established as a regression
  from the go-deep feature; do not label it a grader error without evidence.
- `dts-multi-repo`: a run omitted the explicitly required QA-repository context
  warning. Keep the execution failure visible and investigate/reproduce it.

These findings came from a partial 28-case run of aa19778, not a passing full
baseline. Original results remain under ignored local reports. Maintenance
records in suites.json name an owner and follow-up; existing critical failures
are explicitly marked blocking, remain selected, and prevent certification. After a repair, attach
focused live evidence before removing its maintenance record. Never silently
rewrite an observed failed verdict as passed.

## Promotion and future pruning

For each candidate, establish a current source requirement, distinct scenario,
fixture preconditions, sufficient grader evidence and a baseline result. Prefer
local artifact assertions for mechanical facts. Reserve model judges for meaning
that cannot be checked reliably by code. If two cases protect the same behavior
and failure mode, retain the stronger one only after documenting the coverage
mapping. Retire only when the underlying requirement was deliberately removed.
A failure alone is neither duplication nor irrelevance.

## Bounded validation results

- All 640 deterministic tests passed before the final local judge-transport and
  maintenance-record refinements; subsequent affected checks are recorded in the PR.
- The repaired `autopilot-full-info` passed its live focused run.
- The repaired `define-test-strategy-negative-control` failed correctly: the
  model wrote strategy/map files and updated CLAUDE.md without the required
  standalone confirmation. Retain this as a behavior issue, not grader noise.
- All seven critical cases executed. Five passed. `execute-stop-at-gate` stopped
  correctly but omitted required options from the decision log. The full TDD
  workflow completed, but its stage-order grader hit `E2BIG` because the trace
  was passed as a process argument. The fix sends judge evidence through stdin
  and has a large-prompt transport test. Live regrading remains unresolved.

This is not a passing critical baseline. The two cases stay in critical with
explicit blocking maintenance records; no failing case was demoted to obtain a
pass. Workflow fixes are separate follow-ups. Original case verdicts remain
unchanged in local reports. The interrupted run's missing summary can be
reconstructed from its saved per-case traces and grader results with an explicit
recovery qualification; it must not be presented as an original runner summary.
