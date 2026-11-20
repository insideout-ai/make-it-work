<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

## When run by implement


**Workspace runs owned by implement:** when supplied `workspace_contract` (`workspace_version: 1`), read [the workspace contract](../../implement/references/workspace.md) before detection or artifact writes. Its artifact root and approved repository IDs/roots/branches/bases override standalone layout detection, any requirement for root `CLAUDE.md`, and repo-root artifact assumptions. Run source/Git/test operations in the explicit named repo; keep workflow artifacts under the supplied artifact root. Assess only approved scope, including selected test repos. Return newly affected repos or required branch changes before edits there so the parent obtains user confirmation. Forward the contract to nested skills and delegated agents. This override does not change standalone or legacy single-repo behavior.

**Activity checkpoints** — follow [implement's activity contract](../../implement/references/activity.md) for discovery, coverage drafting and final validation. Test authoring and baseline/red verification belong to the later write-the-tests stage. New TDD runs use `--planning-activity discovery|drafting|validation`; the runtime checks actual chat and the next work boundary. Choose each activity sentence once: send it in assistant chat, copy it literally into the helper in a separate Bash call, then perform the work only after success. Do not paraphrase the chat sentence into a different dashboard label, combine the helper with artifact resolution/validation, or treat an earlier skill-loading update as drafting. The reminders at Steps 4, 5 and 5.5 apply again after readiness returns and in replans/amendments.

**Workflow decisions** — follow [implement's workflow-decision audit contract](../../implement/references/workflow-decisions.md). Report explicit workflow choices to the main session as they resolve, before dependent work; keep product answers in their existing deliverables. Use the supplied state path, and preserve the distinction between user answers and automatic resolutions.

**Ticket publication** — return the local plan and handoff; do not upload or post it here. `implement` owns authorized publication of the accepted plan snapshot, including replans/fix amendments. The explicit-local-path ingestion guard remains in force; the caller's separately resolved tracker target does not authorize this stage to access a tracker.

This section applies only when `/make-it-work:implement` runs this skill; a standalone run ignores it entirely.

**Inputs** — the exact Implement workflow state path and resolved Implement skill directory when called from that pipeline (for workflow checkpoints), the spec path, the run's autonomy level (Guided, Autonomous, or Autopilot), the plan version `N`, optional `acceptance_evidence_version: 1` requiring the clause-level AC inventory in the plan template, optional testing-readiness artifact with its verification policy and accepted setup baseline files, an optional **escalation baseline** report (initial mode), optional **redo notes** (when the user asked to redo planning at the approval gate), and the mode-specific inputs below. `implement` selects exactly one mode.

**Readiness before starting** — before investigation, drafting or test writes, run `node "<implement-base>/scripts/testing-readiness.mjs" check --state "<exact-state-path>"`. New checkpoint-enabled runs must have a completed, current parent readiness proof. If pending/stale, return `Testing readiness required: <helper reason>` to the parent without starting the stage or emitting a completed-plan handoff. The parent finishes/reconciles readiness in Plan before redispatch. Do not complete readiness yourself or manufacture a passing baseline. Legacy runs receive a no-op check and retain their old behavior. Replans/fix plans retain choices but still use the current plan version's readiness proof.

**Live autonomy** — the caller also supplies the workflow state path. Follow [implement's chat autonomy contract](../../implement/references/autonomy-changes.md) in this inline session. Before each question/default and return route, use its current saved mode, overriding the entry `--autopilot` flag after a chat change. Keep the current plan version, drafting progress, and previous decisions.

**Initial mode** (`N = 1`) — write `make-it-work/<TICKET>/<TICKET>-plan.md`. If it already exists, overwrite it without the overwrite / `-v2` / abort question; `implement` has already offered the user to reuse it. **With redo notes:** read the existing plan before overwriting it, treat the notes as constraints the new draft must satisfy, and describe which earlier tests remain valid or need adjustment; do not edit them during planning.

**Escalation baseline** — initial mode may also receive `escalation baseline: <report path>`, when a Lightweight run escalated. Read that report before Step 4:

- Its uncommitted changes are an accepted baseline, not a dirty-tree failure. Investigate them as current code, and record them in Pre-flight and Affected Code.
- Plan passing coverage for behavior the baseline already implements; write-the-tests verifies it after approval. One that fails, or an existing regression test the baseline broke, is a baseline defect rather than a pre-existing failure: never return `Blocked:` for it — give it a step that brings it to green.
- Remaining work receives explicit test-first coverage requirements.
- When a review triggered the escalation, `implement` also passes that review report and the decided findings list; treat both as constraints, as in Replan mode.
- Before reducing the plan to the last reported defect, inventory the accepted baseline against the spec: cite existing passing tests, identify untested requirements, and carry concrete gaps into the plan or an explicit verification limitation. For a repeat defect class, carry the bounded sibling/complement cases from the fix diagnosis into test scenarios. Do not assume a previously implemented component has render/behavior coverage merely because its helper tests pass. Keep the investigation scoped to the affected behavior; a complete input-space sweep is neither possible nor required.

**Replan mode** (`N > 1`, with the previous plan path, a feedback path — the review report or `execute`'s saved report — and the decided findings list):

**Spec revision:** when the parent supplies `spec_previous_plan` and the explicitly accepted revised spec, use the previous plan (when not `none`) and recorded refinement resolution as the baseline/feedback. Preserve valid existing implementation/tests and identify what must change. Write a fresh `-plan-v<N>.md` for `N > 1` and emit `mode: replan`; no previous execute/review report is required when the conflict was discovered before execution. If no earlier plan existed, retain initial mode/version 1. Never revive verification from the superseded spec.

**Repository impact revision:** when supplied `impact_previous_plan` and the current assessment, read that previous plan and the accepted spec as the baseline. Preserve valid implementation/tests and cover the revised edits/checks. Use the current plan version's `-plan-v<N>.md` path and emit `mode: replan`; no invented review report or repository-selection approval is needed because the approved repository set is unchanged.

**Workspace scope revision:** when the parent supplies a scope-change reason and `scope_previous_plan`, use that saved plan (if not `none`) and the approved workspace selection report as the replan baseline/feedback. Preserve valid implementation/tests and cover the expanded scope. If no earlier plan exists, author an initial plan at `make-it-work/<TICKET>/<TICKET>-plan-v<N>.md` using the current working tree and any Lightweight report as baseline; do not require an invented previous plan or review report. Emit `mode: replan` for this versioned result. This explicit scope-revision route bypasses standalone filename-collision questions without overwriting earlier plans. Normal review/gate replans below keep their existing inputs.

- Write `make-it-work/<TICKET>/<TICKET>-plan-v<N>.md`, without the overwrite / `-v2` / abort question.
- Read the previous plan and the feedback in full before Step 4. Treat every failed assumption, `Route: replan` finding, `Route: fix` finding, decided `Route: human` finding, or `execute` stop as a constraint the new plan must resolve.
- The working tree still contains the previous version's uncommitted implementation and test files. Investigate them as current code, and make every new step say explicitly what it keeps, changes, or removes. Reuse test files that are still valid (reference them in the new steps' `**Tests:**` fields); plan removal or adjustment of obsolete tests inside the new steps; write-the-tests performs authorized edits. Removals are ordinary file edits — never `git checkout`, `reset`, `restore`, or `stash`.
- Add `**Replan of:** <previous plan path> — <one-line reason>` directly under the plan's header blockquote.
- Directly under that line add `**Design reset:**` — a few sentences on what the previous plan modeled or assumed wrongly at the design level (not merely what failed or which findings were raised), and how this plan's model differs. Every new step must follow the new model.
- A regression test that fails because of the previous version's uncommitted changes (it covers a file the previous plan changed, or a test that plan named) is **not** a pre-existing failure: do not return `Blocked:` for it — make the new plan bring it back to green.

**Amend mode** (the current plan path plus one fix source: a review report with the user's decisions on any `Route: human` findings, `execute`'s completion-gate report with the failing tests classified as related, or `implement`'s developer-approved `make-it-work/<TICKET>/<TICKET>-final-feedback.md`) — do not rewrite the plan:

- In amend mode, keep existing production logic unchanged while drafting coverage. Do not temporarily mutate it to prove a test can fail. A test-only coverage fix can assert behavior that already works: record its passing baseline honestly and retain the normal execution/verification route for the appended step. The startup-only planning receipt can legitimately return `required: false` after earlier execution; this does not expand the planning stage's permissions.
- Investigate only what each `Route: fix` finding, decided `Route: human` finding, or related failing test touches, using Step 4's discipline.
- Append new steps after the last existing step, numbered `M+1` onward — one per finding that still needs a code change, or per small group of related findings; a finding the user accepted as-is gets no step, so a round can add zero steps — each in the Step 5 step template and each with concrete coverage for write-the-tests.
- Before writing each fix step, find the root cause: state in the step which invariant or assumption the finding violated, then sweep sibling cases in the same function or code path for the same defect and cover them in the step and its tests, not only the cited symptom. When the diagnosis names a test-design pattern rather than a code defect (for example a test that stubs or bypasses the layer that owns new behavior, or a missing error shape), widen the sweep to every plan step and every test in the change that uses that pattern, and record the sweep's scope and the steps it checked in the fix step. If the fix adds a guard, reject, or filter that narrows behavior, the step's tests must also cover what it might wrongly reject (the complement), not only what it correctly rejects.
- **Repeat offender:** if the finding was introduced by an earlier fix step (the report says the fix regressed its own path), or the same function or region was flagged in two consecutive fix rounds, say so explicitly in the step and add `Recommend replan: <function / region> — <why another patch won't hold>` to the return report instead of stacking another patch.
- Add any file a new step touches to Affected Code if it isn't listed yet, and add `**Amended for fix cycle <n> (<review | gate>):**` under the plan's header blockquote.
- **Gate fix source:** each related failing test *is* the new step's progression test, and it is already red — record it in the step's `**Tests:**` field, prefixed with the failing test's repo (`<repo>: <file> …`), as `progression red — failing in the completion gate`, skip Step 5 point 6's baseline check for that test, and write no new test file for it (it already exists). Point 6 still applies to any other regression test the step names.
- For a repo with no strategy location and no framework the sub-phase doesn't apply: add one `## Test Plan` row per new step, naming the step, so `execute` can find that step's manual verification.
- Then update **only** the total `M` in `## Execution Status → Progress` to the new step count with `node "<base>/../execute/scripts/plan-status.mjs" set-total --plan "<plan path>" --total <new step count>` — never the Mode line, never the completed count `N`. This is the one exception to "never edits `## Execution Status` after setting the initial total", and it applies only in amend mode.

**All modes:**

- For `repo_impact_version: 1`, follow [repository impact](../../implement/references/repository-impact.md). Include its exact saved definition in the plan and keep Verification Policy separate from editable files. Context-only repos get no steps, tests, builds, setup or maintenance; verify repos get only required checks. Reassess before promoting one to editable scope.


- Keep Visual Overview consistent with the final plan in initial, replan and amend modes. Amend mode may update this section when the appended fixes change what it depicts; preserve existing steps and execution status under the amendment rules above. Add a missing section only when useful for a legacy plan. Return a clickable link to the actual plan and mention Visual Overview when it contains a diagram; this presentation does not change the return report or JSON handoff schema.
- **Actionable review scope:** address routed `fix`/`replan` findings and explicitly resolved `human` decisions. A Minor `Route: fix` is actionable; `Route: advisory` is not. Do not add correction steps for advisory nits just because they appear in the same report. They remain visibly unfixed unless explicitly promoted for correction.
- Test preparation runs separately after planning/approval; this skill never writes tests or commits anything.
- Retain the readiness policy through initial, replan and amend modes; newly affected repos go back to `implement` for readiness before drafting their steps. Validate a supplied policy with `node "<base>/../implement/scripts/testing-policy.mjs" check --plan <plan-path> --required` before returning. Planning never installs tooling or silently downgrades an automated row to manual.
- **Baseline verification:** write-the-tests owns baseline execution and reports observed failures separately; never claim a baseline was verified during planning.

- **Hand-offs:** skip Step 6's "Run `/make-it-work:execute` …" message and the plan-reviewer offer; `implement` decides what runs next.

**Return report** — print Step 6's output block, with `Plan:` set to the path actually written (e.g. `make-it-work/<TICKET>/<TICKET>-plan-v2.md`), followed by:

```
Mode: initial | replan | amend
Steps added: <range, or none, for amend | n/a>
Blocked: <reason>        ← only when applicable
Recommend replan: <reason>   ← only when applicable (amend mode, repeat offender)
```

Then stop.

**Version 1 handoff** — when the caller's workflow state contains `handoff_version: 1`, also read `../implement/references/handoffs.md` and write a new `plan-<N>.json` in `make-it-work/<TICKET>/<TICKET>-handoffs/`. Use `PLAN_SAVED` for initial/replan mode or `FIX_PLAN_READY` for amend mode. Record the actual plan path, `mode`, numeric `steps_added` in amend mode (otherwise `null`), the `Recommend replan:` reason or `null`, and updated context paths (Step 6's `Test scope:` line stays out of the JSON). For a pre-existing failing regression that stops planning, emit a `blocked` handoff with `code: PRE_EXISTING_REGRESSION` and the exact test/reason, rather than claiming a completed plan. Do not write a handoff for an older run. End the chat report with `Handoff: <path>`.
