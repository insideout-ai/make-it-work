# Implement context isolation

## Objective and safety gate

Reduce parent-session instruction and output loading without changing workflow
functionality, user controls or completion standards. Functional safety takes
priority over the 50% instruction-volume reduction target. Runtime peak input,
static text estimates and cumulative token processing are separate measurements.

This work is based on the combined PR #97 (`2584a9d`) and PR #98 (`9147f18`)
integration snapshot `4a97614`. It belongs to a separate PR. Neither prerequisite
branch is changed. Reconcile their latest heads before final validation.

## PR #99 scope and follow-up

PR #99 prepares patch version 5.7.2. It contains the baseline repairs, equivalent
machine-readable state defaults, phase-specific instruction loading and local
context measurement. It preserves execution placement, all existing workflow
gates, terminal handoff formats and saved-run markers. No dispatch journal or
new delegation behavior is included.

Delegation belongs to a separate follow-up PR based on this checkpoint. Start
with explicit opt-in for new runs and refinement only. Keep the parent as the
sole dispatcher and owner of human questions, approvals, workflow state,
progress and external writes. Validate questions/resumption, interruptions,
unavailable workers, duplicate/stale results and guidance loading before
expanding to planning/readiness, execution or finalization. Existing unmarked
runs and standalone skills retain their original behavior. Functional safety
takes priority over the eventual instruction-volume target.

For this patch, require complete deterministic, packaging, smoke, critical and
change-specific evals on the final committed source. Include Guided/Autopilot,
legacy resume, fix planning and full feedback coverage. Record scoped results
and unresolved failures in the PR and local release record. A version bump does
not authorize merging, publishing a release or changing a directory submission.

## Baseline evidence and current progress

- Combined baseline: 672 deterministic tests passed; complete smoke 14/14 passed.
- Original critical run: 6/7 passed. Full TDD reached Complete, but temporary
  production mutation during fix planning violated the existing Modify-row
  planning boundary. Its failed verdict remains preserved.
- The grader also criticized permitted planning test edits and evidence-ledger
  writes. Clarification distinguishes those from the actual production mutation;
  it does not authorize mutation testing during planning.
- Focused repaired snapshot: execution success, failed-gate handling and feedback
  collection passed 3/3; complete repaired smoke passed 14/14 and critical passed
  7/7. All later refactor gates remain separately scoped.
- Logging now constructs the full canonical execution-mode payload. Standalone
  feedback explicitly requires supplied-input access, per-finding follow-up fields
  and complete saved-file readback even after the user skips further questions.
- A focused legacy fix-plan fixture exercises a coverage-only amendment against
  already-correct production behavior, followed by an explicit pre-execution pause.

Detailed reports and raw transcripts remain local under ignored `evals/results/`.
Passing samples do not guarantee all future model behavior. No delegation or
context-saving result is claimed before its own gate has passed.

## Extraction candidate evidence

The frozen extraction candidate `dd86187`, based on `166b7d7`, moves all 142,298
original prose characters into phase-specific references (with relative links
rebased), preserves hooks, and extracts all 52 initialization defaults unchanged.
Its entry file is 6,864 characters versus 143,507 before extraction. This is not
an equivalent percentage reduction in runtime context.

All 676 deterministic checks passed. Startup, queued autonomy and fix-plan
boundary model cases passed. Legacy resume initially received an incorrect
semantic failure: the first relative render command failed, but its absolute-path
fallback succeeded and the actual dashboard contained the completion row. The
original failure is retained. A direct artifact check and negative placeholder
control now protect that requirement; regrading the saved trace passed. No
workflow rule was relaxed to excuse the failed first command.

One startup sample's observed parent peak input, including cached input, fell
from 105,641 to 75,911 tokens (28.1%). The samples used the same reported model;
this does not establish a general reduction, total cost saving or remaining
context capacity. The complete candidate critical gate passed 7/7 (reported usage $9.22).
No execution placement or delegation is changed by extraction.
