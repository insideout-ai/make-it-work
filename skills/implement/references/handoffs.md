# Implement handoffs (version 1)

This contract applies only inside `/make-it-work:implement` runs whose state file has `handoff_version: 1`. Standalone skills keep their existing reports. Runs created before this field existed continue using their original handoff and transition instructions until they finish; never add the field to an old run during Resume.

The Markdown spec, plan, execute report, and review report remain the human-readable record. After a stage finishes or reaches a hard stop, create `make-it-work/<TICKET>/<TICKET>-handoffs/` if needed and write one small JSON handoff there. Name files `<stage>-<N>.json`, where `N` is one higher than the greatest existing number for that stage, starting at 1. Never overwrite a handoff: a redo or fix cycle gets a new file. The state file remains the source of truth for the current phase and loop counters. A handoff records the stage's result, not a second copy of workflow state.

All handoffs have:

```json
{
  "version": 1,
  "ticket": "DEMO-1",
  "stage": "gaps | plan | execute | review",
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
| gaps | `QUESTIONS_SENT` (Slack export, or its offline-file fallback) | `{}` — the artifact is `questions: make-it-work/<TICKET>/<TICKET>-questions.md` instead of `spec` |
| plan | `PLAN_SAVED` for initial/replan; `FIX_PLAN_READY` for amend | `mode` (`initial`, `replan`, `amend`), `steps_added` (integer for amend, otherwise `null`), `recommend_replan` (reason string or `null`), `context_updated` (path strings) |
| execute | `PASSED`, `VERIFIED_MANUALLY`, `GUARDRAIL`, `RETRY_LIMIT`, `GATE_FAILED`, `GATE_NO_RESULT`, `EXECUTE_STOPPED` | `discoveries` (strings), `failing_tests` (test names/paths, required and nonempty for `GATE_FAILED`), `gate` (`none`, `full-suite`, `scoped`, `scoped+full`) |
| review | `CLEAN`, `FIX_REQUIRED`, `REPLAN_REQUIRED`, `HUMAN_DECISION` | `findings` (see below), `context_gaps` (strings) |

For a run with `verification_version: 1`, a `done` Execute handoff also has `artifacts.verification: make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json`. The validator checks the ledger's schema, gate outcome, and AC rows against the plan's traceability table. Older runs omit it. See `verification.md` for the ledger contract.

`VERIFIED_MANUALLY` always requires that artifact and `data.gate: none`, including when a standalone plan is reused. Artifact validation requires an explicit all-manual plan policy and actual scenario/AC evidence. It routes directly to Review at every autonomy level, because the manual policy was already authorized before execution. Missing automated results without that policy still use `GATE_NO_RESULT` and its existing question/Autopilot stop. The handoff's gate must match its ledger.

Review `findings` lists actionable findings only. Each is `{ "id": "#1", "route": "fix | replan | human", "region": "path:symbol or function", "introduced_by_fix_of": "#N or step N" | null }`. Use a stable region label across rounds. `CLEAN` has no actionable findings; minor nits remain in the Markdown review. The validator derives the expected outcome from the finding routes and rejects a disagreement.

## After each stage

1. Finish the normal Markdown artifact and chat report. For Execute, first save the terminal report to `make-it-work/<TICKET>/<TICKET>-execute.md`, as `implement` already does.
2. Write the JSON handoff using the actual artifact paths and current plan/review counters. These JSON files are local run data under the same ignored `make-it-work/` directory as the other artifacts.
3. Run `node "<implement-base>/scripts/handoff.mjs" validate --handoff <path> --root <artifact-root>`. The artifact root is the directory containing `make-it-work/`, not necessarily a service repo. On validation failure, correct the result or report a blocked run; never route from invalid JSON.
4. Run `node "<implement-base>/scripts/handoff.mjs" next --handoff <path> --root <artifact-root> --state <state-file>`. It reads state and artifacts but writes nothing. Use its JSON `action` as the routing decision:
   - `phase`: checkpoint the returned `phase`; apply `operation` (`replan`, `manual-walkthrough`, `resume-after-edit`, or `resume-with-baseline-decision`) using the existing phase instructions.
   - `ask`: present its question and `choices` in the main session. Record the developer's answer, then call `next` again with `--choice <choice>` and use the returned action. For a `needs_input` handoff, answer the stage's questions and run that stage again; it emits a new handoff.
   - `triage`: run the existing Gate triage, asking about uncertain tests. Then call `next` again with `--related-failures <count>`. If this yields `ask`, apply the preceding bullet and pass the same count again with `--choice`.
   - `pause`: checkpoint `status: Paused` with the returned `pause_reason`, keep the current phase, and show its reason. `QUESTIONS_SENT` is the only outcome that pauses; Resume reads the questions path from this handoff.
   - `stop`: checkpoint the stop and show its reason.
5. For a Review run after the first review of the *same plan version*, pass `--previous-review <previous-review-handoff>`. This lets the helper detect repeat findings in the same region. Do not use a previous plan version's review.

The helper checks the ticket, stage, plan version, review cycle, newest handoff number, result fields, and artifact existence before deciding. For Execute and Review, it also confirms the outcome agrees with the saved Markdown report. Never infer a missing outcome from Markdown. A missing or malformed handoff stops the run with the validation error and can be repaired on Resume by writing a new handoff. It must not silently select a different route.

Approval gates, state writes, dashboard updates, regression classification, developer answers, and fix/replan counter changes remain with `implement`. The helper returns a decision; it does not mutate state, edit code, answer a question, or approve an artifact. The existing Transition table is the compatibility path for older runs and the source of the detailed side effects of each returned operation.

Ticket publication also belongs to `implement`, under [ticket-publication.md](ticket-publication.md). A valid handoff supplies artifact/evidence inputs, not permission to write externally. Guided artifact approval still precedes publication. Publication uses a separate journal and does not change this handoff schema, helper routing, loop counters or implementation completion status.
