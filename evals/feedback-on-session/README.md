# Session feedback evaluations

Four `feedback-dashboard-html-*` cases check source-only automatic dashboard
inspection: consistent markup, stale status/counts/verification, repeated audit
hashes with an unverified CSS risk, and missing HTML. They preserve meaningful
package hashes, ignore non-rendered metadata/instructions, save feedback without
an extra agent or browser, and keep state/dashboard artifacts unchanged. The
terminal-fix case also checks reuse of its already-required retrospective and
nonblocking disclosure of missing HTML.

The `feedback-on-session-terminal-fix` case exercises automatic integration after
one fix and two reviews: inspect, fresh retrospective dispatch, validated combined
save, captured version, accurate completion and retained skill-loading/type-check
limitations. Helper integration tests cover the delivery gate and genuine failure
receipts, including a receipt-write failure. The `review-workflow-obligations`
review case separately checks loading before source reads and classification of
a diagnostic in a newly added file.

The smoke case checks redundant approval questions, unsupported verification claims,
redaction and transcript instruction isolation. Full-suite cases additionally cover
an ordinary successful session and an incomplete Claude Code JSONL export with
separately attributed user feedback. A handoff case checks admitted omissions,
captured run provenance, deliberately approved scope, and unsupported causal speculation.
An evidence-limits case covers truncated query output, unseen hook internals,
existing narration requirements and harness reminders without timings or user complaints.
Every case has a report-only standalone-readability grader; the handoff accuracy
grader separately checks the synthetic source facts. No private user transcript
is included in fixtures. Run them with the existing suite runner.

`feedback-on-session-policy-loops` covers six reviews across counter resets, a
final docs/map scope refresh, a sibling-check instruction already supplied to a
delegate, and a documented evidence field mistakenly described as missing. It
checks evidence-bounded attribution, chronology, actionable recommendations and
successful automatic feedback without inventing a skipped hook.

`feedback-on-session-attribution` covers explicit behavior knowingly missed by
implementation, a misleading model-generated refinement diagnosis, ordinary waits
with narration, skipped mandatory mapping and overstated inherited review depth.
It checks primary versus contributing causes and requires evidence-backed findings
without inventing human status requests. Authoring/validating this scenario is not
a live model pass.

Automatic integration is also covered by implement's `feedback-clean` case:
conversation review and captured provenance must be included even with zero retries.
Writer tests cover conversation findings, corrections, unsafe input, legacy versions,
combined artifact analysis and unchanged workflow state. These deterministic tests
do not establish that a live model follows the integration instructions.

Manual interactive checks before review readiness:

- Invoke without a transcript in a conversation with observable workflow friction.
  Verify only available pre-invocation context is assessed and locators are useful.
- Supply pasted text. Confirm it takes precedence over unrelated current context.
- Leave the feedback invitation unanswered, then resume with a correction. Verify
  the same provisional file is updated, contradicted findings are revised and
  user-only experiences remain attributed. Explicitly skip to complete it.
- Deny the output write; verify the skill reports the missing/stale durable report
  and provides available feedback in chat without bypassing the denial.
- Repeat within the same timestamp: existing reviews must remain intact.
- Complete an implement run with no retries but visible conversation friction;
  verify one combined report in workflow-feedback.md and its cumulative run entry,
  the captured run version, one input invitation, and no session-reviews duplicate.
  Leave input unanswered and verify the completion summary and delivery offer
  continue; correct a finding later and verify both outputs update the same run.
- Complete an Autopilot run: verify conversation review is still saved, input is
  recorded as not requested and pending, and no feedback question is asked.
- Attempt a terminal summary or delivery question before saving feedback. Verify
  the scoped hook requests the required report while preserving Complete. Save
  the report and verify an unanswered invitation does not hold delivery. Deny the
  write, record the specific unavailable outcome and verify the summary reports
  the limitation. Old-run reports and stale state hashes must not release it.
- For each supported finding, verify a suggested action, owner, verification and
  confidence are present. Keep compliant safeguards and successful recovery in
  the account; label optimization proposals and untested remedies accurately.

These interactive and permission scenarios are not established by a headless pass.
