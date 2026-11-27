# Test authoring and verification

The approved plan supplies scenarios, expected behavior, layers, test paths and commands. Do not redesign coverage or edit the plan while preparing it. Missing declarations, changed requirements or a required unconfigured layer return to the coordinator/planner before dependent edits.

## Select applicable coverage

Evaluate each product/test repository separately. Explicit manual policy uses exempt preparation rows and retains actual verification for Execute. Otherwise use the test strategy's configured Test Locations, Where New Tests Go, Coverage Decision Guidance and Run Prerequisites. Without a strategy, use the actual configured runner and readiness evidence; placeholder scripts do not establish usable automation. Do not install tooling, substitute a different agreed layer, invent a strategy/map or silently convert automation to manual.

Read the shared [test-map contract](../../../docs/test-map-contract.md) when using a strategy map. Reuse unchanged mappings, inspect assertions for adequate behavior coverage, and reassess only affected evidence. Query across configured locations; external test tokens retain the product repo's Repo ID. Register newly written/changed test identities, supported selectors and behavioral evidence in the product map, preserving unresolved candidates and user decisions. Update its report after saving meaningful map changes. Never add mapping comments/annotations to source or tests. Map-only metadata does not add a product repo.

## Authorization and placement

Under implement, the coordinator follows [pre-edit authorization](../../implement/references/planning-tests.md) before dispatch. The worker does not authorize itself. Edit only declared dedicated test files or the precise authorized embedded region; preserve all protected production bytes. Newly discovered test paths, region changes or stubs return before edits. Even after an earlier execution releases the startup guard, production implementation remains outside this skill's scope.

Standalone, follow project authorization rules. Separate tests, embedded test blocks and executable documentation examples are supported. Source paths are not runner selectors unless the runner explicitly supports them. If precise selection is unavailable, disclose the smallest supported enclosing module/package/suite before running it.

Only standalone preparation may create a plan-declared **New** symbol's minimal signature to reach runtime assertions: use an idiomatic not-implemented throw/raise, or a type-satisfying sentinel only where a throw expression is invalid. Mark it `write-the-tests stub — pending implementation`. Never replace existing logic for a **Modify** symbol. Implement-owned workers require an already accepted setup stub or return a blocker; test-file receipts grant no production-stub exception. Never temporarily mutate production code to manufacture red.

## Reuse, baseline, progression

For each step, inspect existing assertions before writing new ones. Reuse adequate passing regression tests with exact identities/selectors. Verify that each planned test reaches the layer owning the new behavior rather than stubbing, mocking or bypassing it; caller-only coverage does not establish that behavior. If the plan lacks this coverage, return to planning before edits. Write/extend missing planned regression assertions and verify them against existing behavior before implementation. Distinguish an unrelated pre-existing failure from a defect introduced by an accepted Lightweight/prior-plan baseline; the latter remains planned work, not an unrelated-baseline exemption.

Then write the progression assertions and run the supported selector. Confirm failure is caused by missing/changed behavior, not compile/type/import errors, broken setup, typos or unrelated failures. Already implemented behavior and coverage-only fixes should pass; record that honestly rather than inventing red. Reuse an existing failing completion-gate test for a gate fix instead of duplicating it, and retain the root-cause/sibling/complement cases the plan requires.

Check prerequisites before execution: a suite with Local run other than yes, missing environment variables or a failed required service check is `not-run` with its precise reason. Never treat it as passing or retry an unavailable environment as a test defect. Runnable regression failures use the baseline triage in the entrypoint; an explicitly accepted unrelated regression remains `accepted-failure`, not green. All other preparation failures block.

Keep edits uncommitted and preserve pre-existing work. Remove/adjust obsolete tests only when the approved plan explicitly declares that edit and applicable authorization permits it; never use reset/restore/stash to discard work.

## Evidence and reporting

Record one preparation entry per exact Test Plan scenario, including its originating step and repository. Record actual commands/working directories, test identities, result, reason and retrievable evidence references. Multiple assertions/files for a scenario can be described in its evidence; register all prepared files in `additional_files` so file freshness includes them.

Standalone narrates test authoring, baseline execution and progression verification as distinct meaningful activities. Implement workers return observations and blockers to the coordinator; they never narrate/checkpoint fictitious live activity into the parent's dashboard while it waits. Neither mode advances implementation Progress.

Keep full logs in local artifacts and return concise relevant evidence, preserving unresolved diagnostics. Read only the guidance/code needed for the active scenarios; store reusable findings as source references instead of carrying discovery transcripts into later stages.

## Purpose and baseline visibility

New coverage-contract plans name Progression or Regression per scenario. Match automated preparation kind to that purpose; manual entries retain kind manual. Reuse one observed command result across multiple named scenarios only when its assertions actually cover them; metadata never requires duplicate execution. Preparation reports derive baseline status from retained observations, not the plan. Do not run additional suites to obtain baseline labels.
