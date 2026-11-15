# Implement context isolation

## Objective and safety gate

Reduce parent-session instruction and output loading without changing workflow
functionality, user controls or completion standards. Functional safety takes
priority over the 50% instruction-volume reduction target. Runtime peak input,
static text estimates and cumulative token processing are separate measurements.

This work is based on the combined PR #97 (`2584a9d`) and PR #98 (`9147f18`)
integration snapshot `4a97614`. It belongs to a separate PR. Neither prerequisite
branch is changed. Reconcile their latest heads before final validation.

## Ordered implementation

1. Establish the baseline; repair relevant logging, feedback and fix-planning
   validation issues. Require passing relevant deterministic and behavioral checks.
2. Extract initialization defaults and relocate orchestration instructions into
   phase-specific references. Preserve the full behavior inventory and verify
   equivalent state defaults before changing execution placement.
3. Introduce a versioned dispatch journal for new runs. The parent alone owns
   dispatch, questions, approvals, workflow state, progress and external writes.
   Preserve terminal handoffs. Validate refinement, planning/readiness, execution
   instructions, then regression/final-sync/feedback boundaries separately.
4. Preserve fresh agents for independent tasks; resume their implementers for
   questions and fixes when supported. Reconstruct unavailable agents from saved
   artifacts only after reconciling existing work. Keep independent review fresh.
5. Pass final deterministic, packaging, smoke, critical and change-specific evals;
   repeat question/resume, interrupted-dispatch and full-TDD cases. Record measured
   context, cost, latency and behavioral outcomes. Leave the PR draft until ready.

Unmarked saved runs and standalone skill behavior retain their existing contract.
Explicit Inline execution remains supported. No plugin version bump, release,
merge, live tracker publication or delivery operation belongs to this change.

## Baseline evidence and current progress

- Combined baseline: 672 deterministic tests passed; complete smoke 14/14 passed.
- Original critical run: 6/7 passed. Full TDD reached Complete, but temporary
  production mutation during fix planning violated the existing Modify-row
  planning boundary. Its failed verdict remains preserved.
- The grader also criticized permitted planning test edits and evidence-ledger
  writes. Clarification distinguishes those from the actual production mutation;
  it does not authorize mutation testing during planning.
- Focused repaired snapshot: execution success, failed-gate handling and feedback
  collection passed 3/3; complete repaired smoke passed 14/14. Critical completion
  and all later refactor gates must be recorded separately.
- Logging now constructs the full canonical execution-mode payload. Standalone
  feedback explicitly requires supplied-input access, per-finding follow-up fields
  and complete saved-file readback even after the user skips further questions.
- A focused legacy fix-plan fixture exercises a coverage-only amendment against
  already-correct production behavior, followed by an explicit pre-execution pause.

Detailed reports and raw transcripts remain local under ignored `evals/results/`.
Passing samples do not guarantee all future model behavior. No delegation or
context-saving result is claimed before its own gate has passed.
