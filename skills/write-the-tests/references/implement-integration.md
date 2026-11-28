# Fresh test-writing worker

Implement's coordinator dispatches this skill in a fresh context, without inherited chat, after applicable plan approval. The dispatch starts with the task, source precedence and edit restrictions, then supplies authoritative references: exact plan/spec paths, workflow state path and implement directory, current mode, plan version, selected repository/workspace contract, readiness evidence and accepted setup baseline, authorization receipts, relevant prior preparation report, and context-discovery/activity contracts. Do not preload unrelated guides or old logs.

Read the supplied workspace and context-discovery contracts before source access. Work only in approved repositories and plan-declared paths. Missing mandatory project guidance remains a blocker. Do not run go-deep or broaden onboarding.

Before dispatch, the coordinator completes testing readiness and preauthorizes known test edits through implement's `planning-tests.mjs` helper. This helper's historical name remains for compatibility. New scope, a new test path, a required stub or an embedded region beyond authorization must return to the coordinator before editing it. The worker never grants its own authorization or resets a baseline.

The coordinator narrates/checkpoints dispatch with the accepted plan's scenario counts grouped by progression/regression and test type, following [dispatch coverage summary](../../implement/references/orchestration/planning.md#write-tests-new-runs), and retains that activity while waiting. The worker returns actual activity/evidence in its report; it never writes state, dashboard, approvals, counters, Progress or activity checkpoints. No fabricated heartbeats or milestone claims. A pending decision is returned with the exact evidence and question; apply the saved autonomy policy only through the coordinator.

The coordinator validates numbered preparation evidence, accepts the native delegate report through `delegate-report.mjs`, and emits a version-1 `tests` handoff with outcome `TESTS_PREPARED`, artifacts `report` and `preparation`, and empty data. A partial/failed preparation uses a blocked handoff. Retain baseline triage: `PRE_EXISTING_REGRESSION` may be returned by this stage. Requirements conflicts retain the existing explicit refinement route.

On replan/amend/resume, pass only current approved inputs and relevant prior evidence. Reuse valid tests; update evidence for the current plan revision, preserving previous numbered reports as history. For a manual-only plan the coordinator can record exempt scenario rows and emit a not-applicable preparation result without dispatching an authoring worker. Mixed plans dispatch for automated rows and retain manual rows as exempt.

## Integrated quality review ownership

Follow [bounded artifact quality review](../../../docs/artifact-quality-review.md).
Apply only to TDD under Implement; standalone skills follow their entrypoint.
Retain existing workspace, edit and activity ownership. The parent alone handles
questions/stops and spec-conflict transitions. Record attempts outside workflow
counters; preserve unfinished/exhausted attempts on resume. A record is evidence
of the inspection, not a new controller gate or schema. Never emit a successful
handoff while quality blockers remain. For refinement the parent invokes review
after mode selection and before spec acceptance/publication.
