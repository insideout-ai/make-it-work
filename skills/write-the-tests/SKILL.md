---
name: write-the-tests
description: "Prepares the automated coverage specified by an implementation plan: reuses or writes tests, verifies regression baselines and expected progression failures, and saves revision-bound preparation evidence. Use after plan-the-work and before execute, including preparation for replans and fix amendments. Does not decide requirements or implement production behavior."
---

# Test Preparation

For impact-enabled Implement runs, read [repository impact](../implement/references/repository-impact.md). Check the saved assessment before preparation. Reuse required tests in verify repos without editing them, skip context repos, and return undeclared test edits for reassessment/replanning. Do not establish missing tooling in a verify repo.

Prepare the approved plan's tests. Keep production behavior unchanged and leave all edits uncommitted. The plan defines coverage; this skill supplies observed evidence. Never treat an import/type/setup error alone as valid progression red.

## Input and context

Usage: `/make-it-work:write-the-tests [TICKET-ID | path/to/plan.md] [--autopilot]`.

For a path, read that plan directly without contacting an issue tracker. Otherwise resolve the ticket from the argument or current branch, then find its saved plan under `make-it-work/<TICKET>/`, honoring the [artifact naming contract](../../docs/artifact-observability.md). With multiple plan revisions, use implement's supplied path or ask which current plan to prepare; do not guess from old chat. Missing ticket/plan is a blocker.

Read the plan, accepted spec and applicable repository guidance. Load only matching test strategy, domain/UC guidance and the conditional references required for the selected test placement. Read each activated guide fully. Keep task boundaries, edit restrictions and completion criteria prominent; use paths to additional evidence instead of copying exploratory conversation or broad code dumps.

The accepted spec controls requirements, the approved plan controls coverage/scope, and current source/test results supply observations. Never substitute an old plan, inferred summary or original ticket for accepted refinements. Return requirements conflicts to close-the-gaps and coverage/design conflicts to plan-the-work before dependent edits.

## When run by implement

Read [implement integration](references/implement-integration.md) before any work. It defines the fresh worker's scope and the coordinator's ownership. Standalone invocations do not create workflow state or a dashboard.

## Prepare coverage

Read [authoring and verification](references/authoring.md) before editing or running tests. Its procedures govern layer selection, reuse, placement, baseline checks, progression red, test-map updates, embedded tests and multi-repo placement. All output recording goes to preparation evidence, never back into the approved plan. An undeclared path or changed scenario returns to planning before edits.

Work step by step. Reuse valid existing tests, including tests from a previous run; inspect their assertions and recheck affected evidence. For already implemented baseline behavior, record a passing test rather than manufacturing red. Manual scenarios are exempt from preparation, not verified by this stage. Do not install tooling or downgrade an automated policy because a dependency is unavailable.

Standalone may create only plan-declared minimal new signatures needed for a runtime assertion failure, under the authoring guide. Implement workers receive no production-stub authorization from a test receipt: if such a stub is required and is not already present in the accepted setup baseline, return a blocker for the coordinator to resolve through the authorized execution/refinement route. Never widen an embedded-test region to include production logic.

Preserve the existing baseline-failure policy: interactive standalone runs ask whether to call out an unrelated failure and continue or stop; Autopilot records it and continues only with unaffected progression coverage, recording that observed regression as `accepted-failure` with its decision reference; it remains failed/unverified. Implement returns a baseline blocker to the coordinator for its existing triage. Failures caused by accepted prior implementation are work for the plan, not unrelated baseline failures.

## Integrated test review

After recording candidate preparation evidence and checking it, but before a
successful handback, follow [bounded artifact quality review](../../docs/artifact-quality-review.md)
for tests. Inspect actual prepared assertions with the spec and plan, not just
scenario names or metadata. Refresh affected preparation evidence after local
corrections. The worker returns the review-record path and disposition to its
coordinator; it does not emit TESTS_PREPARED or write workflow activity itself.
For manual-only plans, the coordinator reviews planned observations using this
procedure without dispatching an authoring worker. Preserve exempt/unverified
status. Unresolved blockers prevent a successful handback even if preparation's
structural check passes.

## Save evidence and return

Use `scripts/preparation.mjs record --plan <absolute-plan> --input <json>` to create a numbered JSON evidence artifact and readable Markdown report. The helper returns actual paths and never edits the plan. Follow artifact-output resolution for manually written inputs/logs. Keep full diagnostic logs retrievable locally and return only relevant excerpts, unresolved errors and paths.

Input schema:

```json
{
  "version": 1,
  "plan_hash": "<planHash from scripts/lib/plan.mjs; excludes Execution Status>",
  "status": "ready",
  "entries": [{
    "scenario": "<exact Test Plan scenario>", "step": 1,
    "repo": "<repo ID>", "cwd": "/absolute/test/repo",
    "file": "test/example.test.js", "command": "<supported scoped command>",
    "kind": "progression", "result": "expected-red",
    "reason": "<observed missing behavior>", "evidence": "<retrievable log path or check reference>"
  }]
}
```

Kinds: `progression`, `regression`, `manual`. Results: `pass`, `expected-red`, `not-run` (reason required), `exempt` (manual only), `accepted-failure` (regression only, explicit `decision` reference required), `fail` (blocks preparation). Use `not-applicable` only when all planned scenarios are manual. A blocked report may contain partial entries; preserve it on interruption rather than claiming completion. The helper fingerprints prepared test files and rejects missing scenarios, undeclared test paths, changed plans/files and stale reports.

Run `scripts/preparation.mjs check --plan <plan> --required 1` before reporting success. Expected red means preparation succeeded, not implementation passed; `not-run` remains a verification limitation. Preparation never advances Execution Status.

Return `Preparation: <JSON path>`, `Report: <Markdown path>`, `Status: ready | not-applicable | blocked`, changed files and unresolved limitations. Standalone, direct the user to execute only after a successful check. Under implement, the coordinator validates the result and writes the stage handoff; the worker does not modify workflow state, approvals, HTML or publication records.

Design references: [context-fundamentals](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/blob/main/skills/context-fundamentals/SKILL.md), [context-degradation](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/blob/main/skills/context-degradation/SKILL.md), [context-optimization](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering/blob/main/skills/context-optimization/SKILL.md). These document design rationale; do not fetch them during routine test preparation.
