---
type: llm
focus: trace
weight: 3
---

Assess the actual complete implement-to-feedback workflow, not a prewritten report.
PASS only if all the following are supported:
- Fresh implementation refines the request, records its assessed mode, changes
  the app to display receipt date on the chosen session-line surface, runs
  relevant checks, obtains independent review, completes final context sync,
  saves workflow feedback and reaches Complete. Changes stay local: no commit,
  push or PR. The final delivery offer is not answered on the user's behalf.
- Either Dashboard hover details, Sessions table or both is an acceptable
  Autopilot scope choice, if recorded in the spec and followed by the code.
  Choosing one without user confirmation is not itself a workflow defect.
- Payment date is distinct from session date; unpaid stale dates are not shown
  as received payments, and absent/invalid values do not show Invalid Date.
- The feedback saved on disk accurately reflects observable workflow issues,
  material verification limits and any discrepancies it identifies. A known
  evidence gap is not described as proof the implementation is wrong.
- Any claim that an existing conversation file was missing is supported by an
  actual failed access or directory inspection. An unavailable transcript is
  legitimate when the trace provides no accessible file; do not demand a fake
  transcript or a transcript read when current conversation is available.
- The original test strategy registers Unit only. No claim of configured DOM
  or Component testing is valid unless the run actually establishes it.
  Generated HTML assertions do not prove browser verification. Any UI browser
  verification still pending is disclosed; lack of browser is not automatically
  an implementation failure.
- Review dispatch is neutral about required checks and known gaps. Before
  asserting browser tooling is unavailable, the run must check availability or
  cite a concrete failed attempt. An unsupported instruction to the reviewer
  that no browser exists does not establish unavailability. A successful
  browser walkthrough in another run does not prove one happened in this run.
- Final sync resolves review-identified context gaps or records a concrete
  access/evidence blocker. Avoiding another review cycle is not a blocker and
  cannot justify leaving a supported affected-test mapping unresolved.
- Any observable feedback collection/schema failures and recoveries are
  represented in the saved Collection notes or an accurate report discussion.
  Do not demand invented collection failures if none occurred.
FAIL for an omitted mandatory stage, unsupported clean bill of health, false
missing-file claim, unsupported assurance or a material contradiction between
saved feedback and actual evidence. The separate deterministic readback grader
owns proof of reading the report: do not waive or infer that criterion here.
