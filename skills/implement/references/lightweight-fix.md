# Lightweight fix checkpoint

Read this for a review-requested or final-feedback Lightweight fix, including a
resume with `fix_cycle > 0`. Keep the saved round count. Initial implementation
(`fix_cycle: 0`) does not use this checkpoint.

Before corrective source edits or dispatch, inspect the actual fix source and
evidence, then prepare one diagnosis per actionable finding under Fix's policy.
The fix delegate must load the repository's required domain/UC skills before
editing, using its prescribed method. The inline pipeline-stage rule is not a
ban on repository Skill calls. A prior delegate's admission that it skipped the
gate requires loading and reassessment, not a silent pass into re-review.
If the cause is unknown, investigate read-only before selecting a patch. Keep
unsupported corrections blocked under the existing stop policy.

Save a temporary JSON input with this shape (use a unique temporary path per
invocation; this input is not another permanent workflow log):

```json
{
  "source": "make-it-work/<TICKET>/<TICKET>-review.md",
  "findings": [{
    "id": "#1",
    "failure": "<expected versus observed>",
    "evidence": "<actual check output and affected path>",
    "cause": "<explanation supported by that evidence>",
    "next_change": "<bounded correction>",
    "expected_result": "<observation distinguishing a correct explanation>",
    "related_cases": ["<bounded sibling/complement case, expected result, and check to run; or evidence why none apply>"]
  }]
}
```

Use `<TICKET>-final-feedback.md` instead for a final-package change request. If
an earlier correction failed, include `prior_result` explaining what its result
taught you and why this correction is supported.

New diagnosis records use version 2 and require `related_cases`; saved version 1 records retain their original recovery contract. Select cases from the actual violated invariant and nearby implementations, not an exhaustive input space. The fix report must reconcile each case with an actual check/result or a concrete verification gap. The parent and independent reviewer inspect that evidence; the presence of a list alone does not establish coverage. If a suggested correction checks only the reported instance despite evidence of related cases, broaden the diagnosis and tests before dispatch. Do not prescribe one exact replacement that prevents the executor from addressing the diagnosed scope.

Run these commands in order, using the artifact root and exact workflow state:

```sh
node "<base>/scripts/lightweight-fix.mjs" checkpoint --root "<artifact-root>" --state "<state-path>" --input "<temporary-diagnosis.json>"
node "<base>/scripts/lightweight-fix.mjs" inspect --root "<artifact-root>" --state "<state-path>"
```

Checkpoint writes the current `## Fix round <n>` diagnosis to the existing
implementation report before appending a stable audit Result and refreshing an
existing dashboard. Failure blocks dispatch. An identical checkpoint call
repairs an interrupted audit/render without duplicate sections or rows. On
resume, inspect first; if only audit/render recovery is needed, reuse the saved
source and findings from that round's report. Never fabricate a retrospective
pre-edit diagnosis. Changed diagnoses or spec/fix-source contents require
reconciliation rather than silently replacing history.

Only after successful inspection, dispatch one fresh fix subagent with the
checkpointed diagnosis and existing report. The parent does not edit product
source. The agent preserves the saved diagnosis and appends its changes/checks
under that round. Reconcile an already-running agent before redispatch on
resume. Before accepting a completed fix handoff, the controller validates the
report, audit entry, round and current spec/fix source; it cannot certify that
an agent was actually dispatched or that the diagnosis is true.
