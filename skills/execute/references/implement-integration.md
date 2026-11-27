<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

## When run by implement

**Absolute helper inputs:** resolve the saved plan once with `node "<base>/../../scripts/artifact-output.mjs" inputs --root <artifact-root> --plan <saved-plan-reference>`. Pass the returned absolute `plan` unchanged to verification, preparation and worker calls regardless of their cwd. This read-only resolution preserves saved naming; it does not approve a changed plan or repository. Retain the supplied absolute workflow state path.


**Workspace runs owned by implement:** when supplied `workspace_contract` (`workspace_version: 1`), read [the workspace contract](../../implement/references/workspace.md) before detection or artifact writes. Its artifact root and approved repository IDs/roots/branches/bases override standalone layout detection, any requirement for root `CLAUDE.md`, and repo-root artifact assumptions. Run source/Git/test operations in the explicit named repo; keep workflow artifacts under the supplied artifact root. Assess only approved scope, including selected test repos. Return newly affected repos or required branch changes before edits there so the parent obtains user confirmation. Forward the contract to nested skills and delegated agents. This override does not change standalone or legacy single-repo behavior.

**Activity checkpoints** — follow [implement's activity contract](../../implement/references/activity.md) alongside the per-step Progress contract below. In this inline session, save the exact narrated activity before each implementation/verification chunk, step/batch dispatch, and nested regression invocation. Retain the delegated-work description while waiting; per-step subagents must not write workflow activity or edit HTML. A legacy single-step subagent's required Progress helper may still regenerate the dashboard under the existing per-step contract. Pass the resolved `implement` directory and activity contract to nested inline regression. Standalone runs and older runs without a dashboard do not create one.

**Workflow decisions** — follow [implement's workflow-decision audit contract](../../implement/references/workflow-decisions.md). Report explicit workflow choices to the main session as they resolve, before dependent work; keep product answers in their existing deliverables. Use the supplied state path, and preserve the distinction between user answers and automatic resolutions.

This section applies only when `/make-it-work:implement` runs this skill; a standalone run ignores it entirely. Everything above still applies unchanged — Phases 0–5, the retry limit, the guardrail, the halt scope, and the never-git-commit rule.

**Inputs** — the plan path (always passed explicitly, so Phase 0 point 2 uses it directly — it may be a versioned `make-it-work/<TICKET>/<TICKET>-plan-v<N>.md`) and the run's autonomy level (Guided, Autonomous, or Autopilot). When the run has an existing participating dashboard, also pass the exact state-file path `make-it-work/<TICKET>/<TICKET>-state.md` as the **dashboard state path**; do not pass it for an older run whose dashboard is absent, because `implement`'s no-backfill rule still applies. When this invocation is resuming a fix-plan round's own added steps, also: the round's dispatch order (`sequential` or `parallel`) — omitted for the original plan's own execute invocation, which always dispatches sequentially regardless of this input's absence.

**Per-step dashboard contract** — every single-step or completed-batch Progress advance carries the dashboard state path into `plan-status.mjs`, so it updates the active Execute dashboard before reporting or continuing. `implement` must not defer this to its terminal Execute handling: it still owns state mutations, phase-transition renders, and an `EXECUTE_STOPPED` checkpoint when the command fails, but the active Execute dashboard is owned by this per-step command.

**Live autonomy** — the caller also supplies the **workflow state path**, even when no dashboard exists. Follow [implement's chat autonomy contract](../../implement/references/autonomy-changes.md) in this inline session. Before every question/default, next step/batch dispatch, inline pause decision, and completion-gate invocation, use the current saved mode instead of the entry `--autopilot` flag. Finish/checkpoint an in-flight step or batch before applying a delivered request; preserve Progress, retry counts, execution mode, and inline pause mode. In Guided/Autonomous the stored inline pause choice applies again; Guided alone does not introduce per-step stops. Pass the workflow state path as context to nested `run-regression`, appending `--autopilot` only if the current mode is Autopilot. Per-step subagents do not handle chat changes or mutate workflow autonomy; this main session owns them. The workflow state path alone never authorizes dashboard creation.

**Mode (Phase 0 point 3)** — when the Mode line reads "Not yet chosen":

- **Guided** — ask the user exactly as in a standalone run. If they choose to review the plan first, do not wait inside this run: end it with the `EXECUTE_STOPPED` outcome below (reason: user reviewing the plan).
- **Autonomous** — do not ask. Record `Subagent-Driven`, the recommended option, in exactly the format Phase 0 point 3 prescribes, and proceed.
- **Autopilot** — invoke this skill with `--autopilot`; its existing Autopilot Mode resolution table selects `Subagent-Driven`, suppresses every safe prompt, and forwards the flag to `run-regression`.

A Mode line that already records a mode is used as-is, in both levels.

### Blocking questions

For `controller_version: 1`, use [implement's pending-input lifecycle](../../implement/references/controller.md#pending-input-lifecycle) for every blocking question, including Mode, Inline pause follow-up/backfill, per-step review and verification questions. Opening `AskUserQuestion` alone does not update workflow state or HTML.

1. Inspect the supplied workflow state. Before displaying the question, apply `await-input` with a fresh pending ID, `kind: question` (`step` for per-step review), and the actual question, choice IDs, labels and descriptions. Wait for the checkpoint/render to succeed; it preserves Execute and Progress, sets Paused and shows “Waiting for your input.” If it fails, repair/retry the same event before showing the question.
2. Show the saved question. After the actual user answer, apply `resolve-input` with its `pending_id`, the selected choice ID, `source: user` and `via: question|chat` before dependent work. On resume, reuse an existing pending request rather than creating a duplicate or treating silence as an answer.
3. For Mode selection, resolve the Mode request first. If Inline was selected, save and resolve a separate pending request for the pause policy before applying `execution-mode` with both `mode: inline` and `pause_mode`. For Subagent-Driven, apply `execution-mode` after resolving its one request. These controller events replace Phase 0's standalone `set-mode`/`set-pause` commands; the `execution-mode` event does not replace `resolve-input`.

Autonomous/Autopilot policy defaults retain their existing behavior and do not create interactive waits. Standalone and legacy runs retain their existing question handling.

**Completion gate questions** — Guided and Autonomous handle `run-regression`'s own stop-and-ask for a full-suite command as usual. Under Autopilot it remains a hard stop, returned as `GATE_NO_RESULT` for `implement` to checkpoint without a prompt.

**Discoveries under Subagent-Driven mode** — add one item to every per-step dispatch prompt: "End your report with a `Discoveries:` line listing reusable facts about the existing system you noticed (an undocumented caller, an invariant the code enforces), or `none`." Collect those lines from each step's report for the final `Discoveries:` line below.

**Stop reports point back to `implement`** — keep every field of Phase 3's Case 1 and Case 2 reports and of Phase 4's FAIL / no-result report, but wherever they tell the user to re-invoke `/make-it-work:execute` to continue, say instead: "`implement` will decide the next step." Phase 5's report is unchanged.

**Outcome lines** — after whichever terminal report this run printed, end the output with:

```
Execute outcome: PASSED | VERIFIED_MANUALLY | GUARDRAIL | RETRY_LIMIT | GATE_FAILED | GATE_NO_RESULT | EXECUTE_STOPPED
Discoveries: <reusable facts about the existing system noticed while implementing | none>
Failing tests: <<repo>: <file> / test names from run-regression's captured output tail — <repo> from the failing block's Repo: line | unknown>   ← GATE_FAILED only
```

Map the run's terminal report to exactly one value:

| Terminal report | `Execute outcome` |
| --- | --- |
| Phase 5 final report | `PASSED` |
| Explicit all-manual policy, manual terminal report with validated evidence | `VERIFIED_MANUALLY` |
| Phase 3, Case 1 — Guardrail fired | `GUARDRAIL` |
| Phase 3, Case 2 — Retry limit reached | `RETRY_LIMIT` |
| Phase 4, gate result `FAIL` | `GATE_FAILED` |
| Phase 4, no `Gate result` / `Overall gate result` line at all | `GATE_NO_RESULT` |
| Any other stop, outside Phase 3 and Phase 4 — Phase 0 (plan not found, project root not identified), Phase 2's inconsistent-dependency check, or the Guided review-first choice above | `EXECUTE_STOPPED` |

`Discoveries` records facts about the system *as it already was* — for example an undocumented caller or an invariant the code enforces — never the changes this run made; `implement` uses them in its final context sync.

**Version 1 handoff** — when the caller's workflow state contains `handoff_version: 1`, save the complete terminal report and outcome lines to `make-it-work/<TICKET>/<TICKET>-execute.md` (the path `implement` already uses), then read `../implement/references/handoffs.md` and write a new `execute-<N>.json` under `make-it-work/<TICKET>/<TICKET>-handoffs/`. Its `report` artifact is that saved report. Include the actual gate mode (`data.gate`: `full-suite`, `scoped+full`, or `none` for `VERIFIED_MANUALLY`), discoveries, and identified failing test paths/names. If a `GATE_FAILED` report cannot identify any failing test, emit `needs_input` with the missing-evidence question instead of a false completed result. Do not write a handoff for an older run. End the chat output with `Handoff: <path>`; `implement` reads the saved report rather than overwriting it in this mode. In a fix round (`fix_cycle > 0`) the saved report is cumulative: keep earlier sections as history, append the round's steps and terminal report, and end with exactly one current `Execute outcome:` line. Before validating, relabel each earlier outcome line as history, for example `Previous execute outcome (before fix cycle <n>): PASSED`; the handoff validator accepts only one current outcome line and it must match the handoff.

**Verification evidence** — for `verification_version: 1`, maintain the versioned ledger described in `../implement/references/verification.md`. At Phase 4's terminal gate result, record its actual mode/result without rerunning it (`gate.mode`: `full-suite`, or `scoped+full` for Phase 4's tags + full gate). For `acceptance_evidence_version: 1`, preserve every planned requirement clause and record its concrete assertion/observation (`clause`, `expected`, `observed`, `source`) on the actual passing check. Name matching alone cannot verify a clause; keep unsupported clauses unverified and pass `--require-clauses 1` to partial and terminal validators. At any terminal Execute outcome, map every row in the plan's existing AC traceability table to actual passing step evidence or mark it unverified, then run the verification helper with `--plan` and `--outcome`. Do this before writing the handoff. Include `artifacts.verification: make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json` in a `done` Execute handoff. A missing or invalid ledger is a stopped run to repair on resume, never an inferred pass.
