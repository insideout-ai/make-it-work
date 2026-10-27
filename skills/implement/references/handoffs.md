# Implement handoffs (version 1)

This contract applies only inside `/make-it-work:implement` runs whose state file has `handoff_version: 1`. Standalone skills keep their existing reports. Runs created before this field existed continue using their original handoff and transition instructions until they finish; never add the field to an old run during Resume.

The Markdown spec, plan, execute report, and review report remain the human-readable record. After a stage finishes or reaches a hard stop, create `make-it-work/<TICKET>/<TICKET>-handoffs/` if needed and write one small JSON handoff there. Name files `<stage>-<N>.json`, where `N` is one higher than the greatest existing number for that stage, starting at 1. Never overwrite a handoff: a redo or fix cycle gets a new file. The state file remains the source of truth for the current phase and loop counters. A handoff records the stage's result, not a second copy of workflow state.

All handoffs have:

```json
{
  "version": 1,
  "ticket": "DEMO-1",
  "stage": "gaps | plan | implement | execute | review",
  "plan_version": 1,
  "status": "done | blocked | needs_input",
  "outcome": "stage-specific outcome",
  "artifacts": { "spec | plan | report": "make-it-work/DEMO-1/DEMO-1-….md" },
  "data": {}
}
```

For Review only, also include `"review_cycle": <current review_cycle from the state file>`. For `blocked`, omit `outcome`, `artifacts`, and `data`, and include `"reason": "…"`. Planning may also include `"code": "PRE_EXISTING_REGRESSION"` for the documented baseline-test blocker. For `needs_input`, omit `outcome`, `artifacts`, and `data`, and include `"questions": ["…"]`. Use no secrets or raw test output in JSON.

Stage-specific `done` fields:

| Stage | Outcome | Required `data` |
| --- | --- | --- |
| gaps | `SPEC_SAVED` | `tbd_items` (integer), `context_updated` (path strings) |
| gaps | `QUESTIONS_SENT` (Slack draft/send, unconfirmed delivery, or offline-file fallback; the name does not prove a send) | `{}` — the artifact is `questions: make-it-work/<TICKET>/<TICKET>-questions.md` instead of `spec`; its Slack metadata records actual delivery |
| plan | `PLAN_SAVED` for initial/replan; `FIX_PLAN_READY` for amend | `mode` (`initial`, `replan`, `amend`), `steps_added` (integer for amend, otherwise `null`), `recommend_replan` (reason string or `null`), `context_updated` (path strings) |
| implement (Lightweight phase; file `implement-<N>.json`) | `IMPLEMENTED` (failures use `blocked`) | `changed_paths`, `checks` (checks run and results), `discoveries` (strings), `risk_signal` (why the change looks riskier than Low, or `null`); artifact `report: make-it-work/<TICKET>/<TICKET>-lightweight.md` |
| execute | `PASSED`, `VERIFIED_MANUALLY`, `GUARDRAIL`, `RETRY_LIMIT`, `GATE_FAILED`, `GATE_NO_RESULT`, `EXECUTE_STOPPED` | `discoveries` (strings), `failing_tests` (test names/paths, required and nonempty for `GATE_FAILED`), `gate` (`none`, `full-suite`, `scoped`, `scoped+full`) |
| review | `CLEAN`, `FIX_REQUIRED`, `REPLAN_REQUIRED`, `HUMAN_DECISION` | `findings` (see below), `context_gaps` (strings) |

For a run with `verification_version: 1`, a `done` Execute handoff also has `artifacts.verification: make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json`. The validator checks the ledger's schema, gate outcome, and AC rows against the plan's traceability table. Older runs omit it. See `verification.md` for the ledger contract.

`VERIFIED_MANUALLY` always requires that artifact and `data.gate: none`, including when a standalone plan is reused. Artifact validation requires an explicit all-manual plan policy and actual scenario/AC evidence. It routes directly to Review at every autonomy level, because the manual policy was already authorized before execution. Missing automated results without that policy still use `GATE_NO_RESULT` and its existing question/Autopilot stop. The handoff's gate must match its ledger.

Lightweight has no plan or verification artifact: its handoffs carry the state's current `plan_version` (1 unless the user downgraded after a replan), and the spec is Review's requirements source.

Review `findings` lists actionable findings only. Each is `{ "id": "#1", "route": "fix | replan | human", "region": "path:symbol or function", "introduced_by_fix_of": "#N or step N" | null }`. Use a stable region label across rounds. `CLEAN` has no actionable findings; minor nits remain in the Markdown review. The validator derives the expected outcome from the finding routes and rejects a disagreement.

## After each stage

For `controller_version: 1` runs, use `workflow.mjs apply` with event `handoff` under [controller.md](controller.md) instead of manually applying `next`'s side effects. It calls the same routing policy, persists the result once, and owns the counters. The instructions below remain the legacy path and explain pending questions/triage.

1. Finish the normal Markdown artifact and chat report. For Execute, first save the terminal report to `make-it-work/<TICKET>/<TICKET>-execute.md`, as `implement` already does.
2. Write the JSON handoff using the actual artifact paths and current plan/review counters. These JSON files are local run data under the same ignored `make-it-work/` directory as the other artifacts.
3. Run `node "<implement-base>/scripts/handoff.mjs" validate --handoff <path> --root <artifact-root>`. The artifact root is the directory containing `make-it-work/`, not necessarily a service repo. On validation failure, correct the result or report a blocked run; never route from invalid JSON.
4. Run `node "<implement-base>/scripts/handoff.mjs" next --handoff <path> --root <artifact-root> --state <state-file>`. It reads state and artifacts but writes nothing. Use its JSON `action` as the routing decision:
   - `phase`: checkpoint the returned `phase`; apply `operation` (`replan`, `manual-walkthrough`, `resume-after-edit`, `resume-with-baseline-decision`, `fix`, or `escalate`) using the existing phase instructions. `fix` re-enters `lightweight` to fix the review findings directly (`fix_cycle += 1`). `escalate` enters `plan` with the Lightweight → TDD side effects; the Audit-log reason starts with `Escalation:`.
   - `ask`: present its question and `choices` in the main session. Record the developer's answer, then call `next` again with `--choice <choice>` and use the returned action. For a `needs_input` handoff, answer the stage's questions and run that stage again; it emits a new handoff.
   - `triage`: run the existing Gate triage, asking about uncertain tests. Then call `next` again with `--related-failures <count>`. If this yields `ask`, apply the preceding bullet and pass the same count again with `--choice`.
   - `pause`: checkpoint `status: Paused` with the returned `pause_reason`, keep the current phase, and show its reason. `QUESTIONS_SENT` is the only outcome that pauses; Resume reads the questions path from this handoff.
   - `stop`: checkpoint the stop and show its reason.
5. To escalate at a reassessment checkpoint, add `--escalate "<reason>"` to `next`. After validation it returns the `escalate` route whatever the outcome. It errors unless state has `adaptive_version: 1`, `mode: lightweight` and `escalations: 0`, and cannot be combined with `--choice`.
6. For a Review run after the first review of the *same plan version*, pass `--previous-review <previous-review-handoff>`. This lets the helper detect repeat findings in the same region. Do not use a previous plan version's review, or a review from before an escalation (the plan version stays 1).

Runs with `adaptive_version: 1` route by `mode`. A `SPEC_SAVED` handoff errors while `mode: none` (assess risk first). Otherwise Guided goes to `spec-approval` and others go to `lightweight` or `plan`; the TBD `proceed` route follows the same rule. `IMPLEMENTED` goes to Review. In Lightweight mode, Review routes as follows:

- `CLEAN` goes to `final-sync`. The review limit stops as today.
- `FIX_REQUIRED` goes to `lightweight` with operation `fix`, or stops at `fix_cycle` 3.
- A repeat offender (same region or `introduced_by_fix_of`) or `REPLAN_REQUIRED` escalates.
- `HUMAN_DECISION` asks the human findings (`decide-and-escalate` or `stop`; Autopilot stops), then escalates.

An escalation trigger stops the run when no escalation is left. `mode: tdd` and runs without `adaptive_version` route as before.

The helper checks the ticket, stage, plan version, review cycle, newest handoff number, result fields, and artifact existence before deciding. For Execute and Review, it also confirms the outcome agrees with the saved Markdown report. Never infer a missing outcome from Markdown. A missing or malformed handoff stops the run with the validation error and can be repaired on Resume by writing a new handoff. It must not silently select a different route.

Approval gates, state writes, dashboard updates, regression classification, developer answers, and fix/replan counter changes remain with `implement`. Follow [workflow-decisions.md](workflow-decisions.md) for each explicit workflow choice before dependent work; a decision that changes phase belongs in the ordinary transition row. Inline stage choices are recorded as they resolve, rather than buffered until this handoff. The helper returns a decision; it does not mutate state, edit code, answer a question, or approve an artifact. The existing Transition table is the compatibility path for older runs and the source of the detailed side effects of each returned operation.

Ticket publication also belongs to `implement`, under [ticket-publication.md](ticket-publication.md). A valid handoff supplies artifact/evidence inputs, not permission to write externally. Guided artifact approval still precedes publication. Publication uses a separate journal and does not change this handoff schema, helper routing, loop counters or implementation completion status.
