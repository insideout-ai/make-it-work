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

## Change assessment coverage

New `assess-change` cases: `assessment-sensitive` (smoke), `assessment-inherited`, `assessment-docs`, `assessment-ambiguous`, `assessment-inaccessible-pr`, `assessment-pr-snapshot`, `assessment-partial-multi` (extended). They exercise real standalone skill behavior and durable reports. Deterministic tests in `scripts/change-assessment.test.mjs` cover bands, inherited minimum risk, analyzer availability, multi-repository gaps, unsupported generated/binary scope, snapshot reuse/invalidation, and stale failure history. Final-package integration tests cover both implementation modes and preservation of historical packages and approvals. Inventory does not imply passing behavioral evidence; record run reports before readiness.


## Context-loading refactor checks — 2026-11-17

- `close-the-gaps-slack-send-fallback` and `close-the-gaps-slack-send-resume`:
  both PR #110's baseline and the refactor failed because their semantic rubrics
  required unprefixed new artifact names, contrary to the artifact resolver.
  Repair the rubric filenames to the helper-returned `miw-` paths; preserve all
  recipient, consent, no-resend, answer-provenance and metadata requirements.
- `plan-the-work-with-tests`: the saved plan correctly recorded the test file,
  command and confirmed red state in per-repo lines under `**Tests:**`, but the
  regex required the entire entry on the label's line. Accept both layouts while
  bounding evidence to that field. Deterministic positive and negative examples
  cover multiline entries, missing evidence and unrelated later sections.
- `close-the-gaps-offline-injection`: the retained diagnostic preserved Q1,
  resolved Q2 with its Autopilot marker and excluded Q3 correctly. Its sole
  semantic failure was a separate User Story benefit marked TBD, as the current
  skill requires when the source does not establish it. Restrict the rubric's
  no-unresolved-items requirement to the exported questions; retain all answer,
  provenance and conditional-exclusion assertions.
- The initial standalone live-refinement sample failed to create the expected
  spec. The native runner discarded that failing transcript, so its cause stays
  unclassified. The retained live-refinement diagnostic and second matched
  sample passed unchanged runtime instructions. Retain the initial failed verdict;
  further readiness evidence belongs in the PR.

These repairs do not change suite membership or certify unrun cases. Maintainer:
Erez Morabia; follow-up: attach focused reruns and the PR readiness smoke sequence.


### PR #111 readiness smoke follow-up

The initial 15-case smoke retained 11 passes and four failures. Two native cases
failed authentication. Execute completed its work and gate but called the linked
final-report guide optional and omitted the required fixed report. Keep that
small fixed report in the entrypoint; its field definitions remain conditional.
The unchanged feedback workflow also omitted the assistant questions from an
otherwise supported repeated-permission finding. Clarify its existing sanitized
evidence rule to retain the prior authorization and actual questions, rather
than only the user's objections. Retry only unresolved cases through the saved
PR smoke ledger; retain the original failures and per-case source commits.


The first unresolved-only retry passed live refinement, delivery and Execute.
Feedback's finding evidence passed, but it unnecessarily listed the installed
helper directory before calling the already-specified artifact resolver. Clarify
standalone output handling to use that supplied path directly, without helper
directory browsing/source reads. Retry only this remaining case; do not rerun
passing cases or weaken the standalone evidence boundary.

### PR #115 readiness smoke follow-up

The initial complete 16-case smoke on `8803728` retained 14 passes and two
failures, with `selectionComplete: true`, `repoUnchanged: true` and reported usage
**$5.33503424**. Report:
`evals/results/smoke-2026-11-19T14-39-10-252Z/summary.json`.

- `drive-the-epic-autopilot`: direct inspection of the saved first slice confirms
  that it fixes amounts/dates to their stored representation, although the epic
  leaves date format/timezone unresolved and that slice omits the question. Both
  semantic votes failed. Clarify the existing uncertainty-preservation rule for
  prose/examples and values emitted by an earlier slice; raw/stored/default
  representations are still choices. No new gate or question is added.
- `close-the-gaps-live-autopilot`: the native harness could not find the required
  spec and discarded its temporary trace/fixture. Preserve that failed verdict
  and leave its cause unclassified. Move the same case to the existing headless
  path so the retry retains the transcript/artifacts; prompt, graders, required
  tools and suite membership remain unchanged. A headless pass will not prove
  the native failure's cause or certify native execution.

All 108 eval-harness tests, strict skill validation, 186-case inventory and diff
checks passed after these changes. Retry only these unresolved cases through
PR #115's existing ledger; preserve the 14 passes and initial reports. The
requested total budget remains $12, including the initial run and grading.

The unresolved-only retry on `577e860` passed both cases, with
`selectionComplete: true` and `repoUnchanged: true`. Report:
`evals/results/smoke-2026-11-19T14-47-46-418Z/summary.json`.
Reported retry usage including grading was **$0.81488298**, bringing the combined
total to **$6.14991722 of the $12 cap**. PR #115's ledger records cumulative PASS
for all 16 cases: 14 retained from `8803728`, two from `577e860`. They were not all
rerun on the final commit.

Direct saved-artifact and grading inspection confirms the first export slice now
keeps value representations open instead of selecting a stored form. Refinement
created the required spec, retained the missing-admin-role decision and passed
all unchanged checks. Both semantic checks received PASS/PASS votes. The native
refinement failure's cause remains unknown; the passing retry establishes the
headless path only. Initial failures and per-case source commits remain retained.
The corrected runtime package also built and passed integrity verification. This
evidence-only follow-up changes no tested runtime/skill/fixture content; no second
full smoke run is needed.


## PR #115 — Interactive worktree-offer follow-up, 2026-11-19

The reported fresh Guided session omitted the existing isolated-worktree choice.
Startup guidance now presents both checkout routes directly. No runtime gate or
automatic migration was added; Continue here, explicit choices, Autopilot and
saved Resume roots retain their contracts. Findings and scope are in D021.

Focused report `evals/results/full-2026-11-19T15-37-24-209Z/summary.json`,
source `c4e171e91b167dc1486a98661f3c447e27d3ec71`: 3/3 selected cases passed
(`implement-worktree-offer`, `implement-dashboard-autonomous-start`,
`implement-branch-ticket-mismatch`), reported usage **$0.83981963**. Direct trace
review found that the offer case deferred the early context precheck; its
original grader checked the checkout offer but did not require that ordering.
That pass is scoped to its original rubric, not complete startup compliance.

The entrypoint reminder and offer grader were tightened to preserve the existing
precheck-before-question rule. Report
`evals/results/full-2026-11-19T15-39-46-308Z/summary.json`, source
`3153300ce9ccadc39a4a02927dfddaeba887a0d9`: the strengthened offer case passed,
reported usage **$0.25057248**. The actual trace ran context-inventory inspection
successfully before the checkout question, offered recommended isolation and
current-checkout branch actions, reused Guided/chat choices, and left the answer
pending. The exact-byte source check passed. This rerun was justified by the
observed ordering gap and changed guidance/grader; the other two focused cases
were not repeated. Combined follow-up usage **$1.09039211**. Both reports have
`selectionComplete: true` and `repoUnchanged: true`. These are focused selections
using the full-tier runner, not an archive-wide full pass.

Strict skills validation, 187-case inventory and 108 eval-harness tests passed;
the tests ran before the final prose/grader-only ordering clarification. The
final runtime from `3153300` built, passed integrity verification and strict
exported-skills validation. Existing broad workflow and PR smoke evidence is
retained with its original source commits. No complete smoke was rerun. The
new case remains outside smoke/critical; creation, Continue here execution after
an answer, and Resume are not established by the unanswered-choice case.
