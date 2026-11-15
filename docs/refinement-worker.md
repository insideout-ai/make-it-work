# Opt-in refinement context isolation

This change is based on main `4a222df`, including the PR #102 reconciliation of
PRs #100 and #101. It delegates only initial local Autopilot refinement; ordinary
runs, saved unmarked runs, standalone skills and later-stage execution placement
are unchanged. The new feature is prepared as version 5.8.0.

Use `implement <ticket or pasted requirements> --autopilot --refinement-worker`
for a new single-repository run with local answers. The parent supplies resolved
original ticket content. Explicit external research/delivery requirements are
not dropped: unsupported work returns to the existing inline route after actual
runtime reconciliation. Guided, workspace and Slack initialization do not enable
this first slice. Existing runs cannot acquire its marker on Resume.

The parent reads a small dispatch contract. A fresh general-purpose worker reads
the complete close-the-gaps skill and required repository guidance, investigates,
then returns the existing spec and version-1 gaps handoff. The parent retains
questions, automatic workflow-decision checkpoints, approvals, risk/mode
assessment, state/dashboard writes, publication and subsequent dispatch. A worker
request/reply records a parent checkpoint, not permission or an approval.

Assignments bind task/run/phase/autonomy/repository and application baseline.
The helper rejects duplicate/changed tasks, mismatched runtime IDs, stale phase
or scope, source/test edits, request-ID tampering and changed returned artifacts.
The opt-in controller requires an accepted worker receipt before routing a gaps
handoff. The journal is never proof of agent liveness. If resumption is
unavailable, reconcile the real runtime, record cancellation and recover inline
from saved artifacts; this slice does not implement a general agent scheduler.

A native successful SendMessage resume of a previously launched child can restore
its wait eligibility. The original launch time remains the stage boundary;
resuming an earlier-stage agent does not turn it into current-stage evidence.
Unknown/failed/text-only/synthetic/replayed responses cannot create that proof.
Completion notifications and inventories retain their existing cleanup. The
parent yields for native completion instead of polling or blocking TaskOutput.
The live validation target is Claude Code 2.1.311; other hosts require supported
resumption or the documented inline recovery. See the official
[subagent lifecycle documentation](https://code.claude.com/docs/en/sub-agents#resume-subagents).

## Focused verification

- `refinement-worker.test.mjs`: opt-in/default compatibility, bounded parent
  requests, duplicate/stale/tampered results, application preservation, blocked
  handoffs, controller acceptance and exact-event replay.
- `startup-presentation.test.mjs`: native same-stage resume, terminal cleanup,
  unknown/failed/earlier-stage/synthetic/replayed resume negatives, plus existing
  startup, implementation, Plan/readiness and review gates.
- `implement-refinement-inline-baseline` and `implement-refinement-worker-local`:
  paired source, matching ticket and user-authorized pause after refinement.
- `implement-refinement-worker-blocked`: a seeded eligible run whose worker must
  read the authoritative role map and stop on its missing administrator mapping.
- `implement-refinement-worker-full`: worker refinement followed by the normal
  user-forced Lightweight implementation, fresh review and completion pipeline.

The first exploratory worker run completed correctly but polled during resume;
its original result is retained and it does not certify quiet waiting. The
initial hard-stop fixture correctly stopped before dispatch on a missing file;
it was revised to test a blocker discovered inside the already-entered stage.

Measure parent request peak including cache separately from cumulative processing
and all-agent cost. Compare matched stage boundaries and successful behavior.
Moving work to a child can increase total cost even when parent context falls.
Do not extrapolate a refinement-only sample to whole-workflow savings. Reports
and raw transcripts stay local under ignored `evals/results/`.
