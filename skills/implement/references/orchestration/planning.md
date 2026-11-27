### Plan

Before TDD planning (including reused inputs and escalation), confirm refinement's
[bounded review](../../../../docs/artifact-quality-review.md) covers the current spec.
Planning completes its integrated plan review before successful handoff/approval.
Keep review attempts local to skills; never increment final-review/fix counters.
For blocked/exhausted reviews use existing pending-input/stop handling and the
shared recovery procedure. Resume alone does not grant another attempt.


For `repo_impact_version: 1`, follow [repository impact](../repository-impact.md) before readiness. Pass its exact definition to planning and preserve the separation of editable repos, verification-only repos and context.


Pass the exact workflow state path and resolved Implement skill directory to every planning dispatch. Follow plan-the-work's Planning progress boundaries throughout initial planning, replanning and amendments; keep meaningful activity changes visible through the existing [activity contract](../activity.md), rather than leaving one generic planning description for the whole stage. Planning defines coverage without editing tests; the separate Write Tests stage owns test preparation.

Before Plan discovery/readiness inspection begins, narrate the upcoming investigation and checkpoint that exact sentence through the activity helper. When readiness returns, checkpoint the actual next planning activity before continuing; a single phase-start description must not cover the whole planning stage.

**Live planning updates are main-session work, including while following the inline skill.** For each applicable boundary below, first send the activity sentence in assistant chat, then call the activity helper with that **same sentence**, then do the work. A helper call alone is not narration; a final summary cannot replace a missed live update. Keep the checkpoint separate from the commands that perform the work so the saved activity is visible before a long operation starts.

- Before loading/tracing planning context: describe discovery of the affected code and tests; use `--planning-activity discovery`.
- Before drafting/amending the steps: describe drafting the plan and coverage; use `--planning-activity drafting`.
- Before `validate-plan.mjs normalize-risk` / `check` and semantic self-review: describe final validation; use `--planning-activity validation`. The later handoff/approval transition does not replace this update.

Use the existing helper, never a manual state/HTML edit:

```sh
node "<base>/scripts/dashboard-checkpoint.mjs" activity --state "<exact-state-path>" --activity "<sentence just sent in chat>" --planning-activity <discovery|drafting|validation>
```

New TDD runs check actual parent chat before accepting a planning checkpoint and require the corresponding boundary before reading project files, writing the plan or running validators. If chat has streamed before its transcript flushes, finish that response without more tools and continue on the normal active-stage hook; do not repeat the sentence or ask the user to continue. Keep the helper invocation separate from the work. These are major activities, not a tool-by-tool checklist. Repeat only on meaningful activity changes; omit work that does not apply. Retain the existing delegated-work ownership/wait rules and all failure/permission boundaries in the activity contract. Do not infer a successful test result from an activity description.

Keep accepted requirements separate from implementation observations in planning and test-worker handoffs. Support claims such as “already implemented” or “no production change needed” with the inspected path/assertion and its limits; otherwise present them as assumptions to verify. A previous report or a passing neighboring test does not establish the changed requirement across sibling entry points. Do not prescribe a tests/docs-only correction before that verification. Preserve actual user scope decisions: a code gap against an accepted requirement is corrective work, not a new product decision.

For `acceptance_evidence_version: 1`, pass the marker to every initial, replan and amendment dispatch. Require the plan template’s clause-level AC traceability inventory, checked against every material clause in the accepted spec. Reused plans must satisfy this contract before execution; do not infer clause evidence from existing scenario names.

For a run whose state includes `testing_readiness` (all new runs), before invoking the planning stage read `<base>/references/testing-readiness.md` and follow it for every affected product repo. This also applies when a new run reuses a standalone plan and would enter Execute directly: enter Plan for readiness and resolve the plan's policy before execution. Setup occurs within Plan, with its own saved decision/checkpoints, rather than changing planning's write permissions. For `testing_readiness_version: 1`, begin the parent checkpoint before readiness work, wait for every actual delegate handback, reconcile and complete it, then run its `check` before invoking or resuming `plan-the-work`. A ready-looking file is not completion. Pass the readiness artifact, accepted setup baseline and exact state path to the stage. On replan check newly affected repos and retain prior choices. Older resumed runs without this field retain their existing behavior; never add it just to retrofit setup.

If planning discovers a required selected layer still needing setup and returns `Testing readiness required:`, stay in Plan and resolve that named capability through testing readiness before resuming the stage, passing the updated strategy and accepted baseline. Do not route it as a failing regression or accept a complete plan that silently substitutes another layer. Resume only after readiness succeeds or an explicit verification/scope decision resolves the gap; setup failures follow the readiness reference's stop policy rather than an automatic retry loop.

Follow `plan-the-work` inline — initial mode while `plan_version = 1` (after an escalation, also passing `escalation baseline: <implementation_report>`), replan mode after a replan (with the previous plan path and the feedback path). Under `autopilot`, append `--autopilot` to the stage invocation. Pass the user's redo notes too when redoing the phase. For a version 1 run, record `plan` and `context_updated` from the validated handoff and route a baseline blocker through the helper. For an older run, use the report's `Plan:`, `Context updated:`, and `Blocked:` lines and the original Transition table. In either case record `plan_hash` from the actual plan file when one was completed.

After validated planning/replanning, Autonomous/Autopilot publish the accepted plan snapshot as an attachment or authorized fallback comment, before execution; Guided waits for Plan approval. Reused artifacts and accepted fix amendments use the same publication reference and journal.

### Requirements conflict — return to refinement

The accepted refined spec is the requirements source of truth; the original ticket supplies provenance/context and the plan cannot amend the spec. This applies to initial planning, fix planning, Lightweight work, execution, review and final sync. A clear implementation defect with a solution consistent with the spec follows the normal fix/replan route. If evidence instead requires a requirements decision, stop dependent work in every autonomy mode; neither an Assumption, overall plan approval nor a Decided finding authorizes a spec deviation.

On `Spec conflict:` from planning or a review `Route: human` finding identifying such a conflict, preserve the current spec as a separate local revision snapshot before refinement edits. Record its path/hash, the affected criterion, inspected evidence and decision needed. Controller runs apply `spec-conflict` with that concise `reason`; it pauses at `close-the-gaps`, invalidates downstream evidence and retains the previous plan path for revised planning. Legacy runs checkpoint the same pause and invalidation under their existing state contract. Do not dispatch execution, ordinary fixes, or completion while unresolved.

Present the conflict and obtain explicit user guidance before resuming refinement, including Autonomous and Autopilot. Controller Resume requires `source: user`, `via: chat|question`, and `blocker_resolved: true`; a generic automatic resume cannot resolve it. Run `close-the-gaps` against the current spec and evidence, preserving existing decisions and recording the explicit resolution, decision maker and revision snapshot in its Decision Log. Do not silently substitute the original ticket. If an older blocking input is pending, resolve it through its existing contract before applying `spec-conflict`; never discard it or fabricate an answer. The resulting spec must pass explicit Spec approval in every mode for this revision; plan approval is insufficient. After approval, reassess risk/readiness and regenerate the affected plan/tests, verification and review. Pass `spec_previous_plan` and the refinement resolution to planning; use a new plan filename/version when a previous plan existed. Preserve old reports as history, never as proof for revised requirements.

### Plan approval (Guided only)

Show the plan path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. Record `plan_hash` at the moment of approval.

Make the plan path a clickable Markdown link to the actual saved `.md` file. When it contains a diagram, point to **Visual Overview** so the user can inspect the Mermaid in a compatible Markdown viewer. The HTML preview shows Mermaid source; do not promise an inline chat diagram or generate an image. This also applies when presenting a replan, with no extra approval question.

In this same approval presentation, call out each risk whose **Residual severity** is Medium/Med or High: name the remaining consequence, the mitigation and its evidence/verification limits, and the residual rating. Say explicitly when a mitigation leaves the rating unchanged. Make clear that **Approve** accepts these disclosed residual risks; **Redo this phase** can be used to discuss alternatives. Recommend acceptance only when the evidence supports it; never downgrade a risk to make approval easier. If all residual risks are Low (or there are no risks), omit this warning. This adds no separate question or choice ID and changes neither risk arithmetic, approval hashing nor routing. Autonomous/Autopilot retain their existing behavior without a new approval gate.

On Approve, publish the accepted plan snapshot as an attachment or authorized fallback comment, before advancing to Write Tests (Execute for legacy runs). Use the publication journal to skip identical successful publications. Plan execution may later change its Progress section, so publish the frozen accepted snapshot.


### Write Tests (new runs)

Before any test-edit authorization or worker dispatch, follow [the compaction checkpoint](../compaction.md). For a new marked run at its first accepted TDD plan, finish applicable plan publication, then apply `compaction-checkpoint`; present/wait on its saved inputs in Guided/Autonomous. Autopilot applies the same event and continues without asking. A resolved or skipped checkpoint is not repeated on replans or fix rounds.

Runs with `test_writing_version: 1` enter `write-tests` after Plan approval (Guided) or a completed plan (Autonomous/Autopilot). Reused plans, replans and nonempty fix amendments follow the same route. Do not dispatch Execute until current preparation is accepted. Older saved runs retain existing routing and previously prepared tests; never backfill the marker merely on Resume.

The coordinator reads [the test-worker integration guide](../../../write-the-tests/references/implement-integration.md); the fresh worker reads the complete write-the-tests entrypoint and its applicable authoring guides. Keep those detailed authoring procedures out of the coordinator dispatch context. Complete/check readiness, then follow [test-edit authorization](../planning-tests.md) for exact planned test files before dispatch. Record the actual dispatch activity in chat and the activity checkpoint, then use a **fresh worker without inherited conversation history**. Pass the compact inputs specified by that guide. The coordinator alone owns state, approval, authorizations, dashboard activity and publication. Retain its dispatch description while waiting; do not fabricate worker milestones or heartbeats.

Require the test worker's integrated-review record and disposition before accepting success, following [bounded review](../../../../docs/artifact-quality-review.md). Review manual-only scenarios through the same procedure without an authoring worker.

On handback, accept the native report through delegate-report.mjs. Validate `preparation.mjs check --plan <plan> --file <returned-json> --required 1`, then save the returned report paths through controller event `preparation-saved` (`preparation`: returned root-relative JSON path). This also accepts a validated blocked/partial report so the HTML links its evidence before the blocked handoff stops the run. Emit `tests`/`TESTS_PREPARED` with `report` and `preparation` artifacts only on success; otherwise return a blocked handoff and preserve the observed reason. The handoff routes to Execute only after validation. Baseline failures retain existing triage; a user-approved call-out must remain recorded as failed/unverified coverage, never a passing regression.

For all-manual plans, record one exempt manual row per planned scenario and status `not-applicable`, without dispatching an authoring worker; still route through Write Tests to retain truthful history. Lightweight skips the stage entirely. Mixed plans prepare automated coverage and retain manual scenarios as exempt, not verified.

A worker discovering new paths, unavailable required setup, a stub requirement or coverage/spec conflict returns before those edits. Resolve through the existing readiness/planning/refinement route; do not silently alter the approved plan. After changed approval inputs, redispatch with current references and retain earlier reports as history. No production stub edits are authorized by a test-file receipt.
