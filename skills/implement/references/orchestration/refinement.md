## Phases

Each phase reads its stage skill (see Stage skills), passes the inputs that skill's `## When run by implement` section names, and reads the stage's return report. A `handoff_version: 1` run routes through the validated handoff helper below; an older run follows the Transition table directly.

**Version 1 handoff routing:** pass `handoff_version: 1`, the current `plan_version`, and (for Review) `review_cycle` to every stage invocation. After `close-the-gaps`, `plan-the-work` (including amend mode), `write-the-tests` (via its coordinator-validated worker result), `execute`, or `review-the-code` completes, read the new JSON handoff path from its return report. Validate the handoff with `<base>/scripts/handoff.mjs validate`, then call `handoff.mjs next` with the current state. Follow `<base>/references/handoffs.md` for options and follow-up calls. Never route from the prose outcome line alone in such a run. If validation or routing fails, checkpoint `Stopped` with the exact error and leave the current phase in place; on Resume, repair or rerun that phase and produce a new handoff. An absent handoff is an error, never a reason to fall back to prose. Do not increment a loop counter or advance a phase until the helper returns a valid route. The helper does not write the state or dashboard; this skill still performs the ordinary Checkpoint rule and all existing route side effects. Approval gates and decisions outside a completed stage continue under their existing instructions.

### Close the gaps

**Opt-in worker exception:** when `refinement_worker_version: 1` is eligible under [refinement-worker.md](../refinement-worker.md), follow that parent dispatch/acceptance route instead of the inline call below. Keep all risk assessment, routing and publication steps here in the parent. Otherwise retain the inline route.

Before dispatch, resolve **Choose refinement destination** from the saved state or explicit instruction; if missing, recover a recorded choice or ask now under Guided/Autonomous instead of silently assuming live questions. Follow `close-the-gaps` inline with the ticket, autonomy, exact state path, and — when redoing the phase — the user's redo notes. Under `autopilot`, append `--autopilot` to the stage invocation. A saved `slack-draft` destination appends `--slack`; `slack-send` appends `--slack-send`. Persisted explicit choices also apply under Autopilot; autonomy alone never authorizes sending. If this run already has a pending questions file from a prior delivery attempt, resume it through Phase 5C instead of exporting or sending again. A redo that would send a new message requires a new explicit send instruction.

**Questions prepared for the PM** — when the stage reports `Questions sent: <path>` (a version 1 run: a validated `QUESTIONS_SENT` handoff, which the helper routes to `pause`), checkpoint `status: Paused` with `pause_reason: Slack refinement pending`, keep `phase: close-the-gaps`, and log a same-phase row `Decision: Refinement questions prepared for the Product Manager; delivery <draft|sent|unknown|offline>; questions file <path>`. Take the actual delivery from the questions file's Slack metadata and the stage's `Slack delivery:` line, never from the compatibility outcome name. Regenerate the dashboard. For `draft`, tell the user to review and send the Slack draft; for `sent`, show the message link when available and say it is waiting for replies; for `unknown`, report delivery as unconfirmed without retrying; for `offline`, explain how to forward the questions file manually. Then tell the user to run `implement` again once the PM has replied. Older reports without delivery metadata retain draft-only behavior. No spec exists yet, so nothing is published.

**Resuming a Slack pause** — when Resume finds `pause_reason: Slack refinement pending`, take the questions path from the newest gaps handoff (an older run: from that decision row), set `status: In Progress`, and follow `close-the-gaps` inline with that path instead of the ticket, so it runs as an injection (its Phase 5C). If the stage stops again to keep waiting, re-checkpoint the same pause without a new decision row. Its spec result then routes exactly as below. For a version 1 run, record `spec` and `context_updated` from the validated handoff and route its `tbd_items` through the helper. For an older run, use the report's `Spec:`, `Context updated:`, and `TBD items:` lines and the draft-readiness rule below. In either case record `spec_hash` from the actual spec file.

**Draft with unresolved requirements:** read the spec and route any `SPEC_SAVED` with `tbd_items > 0` immediately, before risk assessment. The helper returns `pause` with `pause_reason: Refinement decisions pending`. Save the spec path/hash and context updates, keep `phase: close-the-gaps`, clear activity, refresh the dashboard and present the linked draft with its remaining decisions. Do not ask another generic accept-TBDs, approval or implementation question. This applies in every mode, including Autopilot, and to legacy/manual runs: saving a draft is not authorization to build.

**Resume a draft:** after normal resume checks, read the saved draft and its recorded answers/questions/dependencies, then resume close-the-gaps with that path and the user's new answers. Preserve resolved answers; ask only unresolved or newly applicable questions. Merely resuming or approving a draft does not clear its TBDs. A still-incomplete new handoff pauses again without downstream work. A completed spec must record the actual answers, authorized defaults or explicitly accepted reduced scope; then produce a newer gaps handoff with zero in-scope TBDs. Do not automatically publish the draft. If an older saved run already advanced with known blocking TBDs, return it to refinement before dispatching more work; use the existing requirements-conflict route when an accepted spec/downstream work must be revised, preserving artifacts and decisions.

In an adaptive run, only a validated `SPEC_SAVED` with zero in-scope TBDs goes through Risk assessment before `handoff.mjs next`.

Once the spec has passed the normal acceptance route, publish it through the publication reference: Guided waits for Spec approval; Autonomous/Autopilot use the validated completion route, except that revisions after a requirements conflict require explicit Spec approval in every mode. Rejected drafts and unresolved hard-stop outputs do not publish.

### Risk assessment

Runs with `adaptive_version: 1` (every new run) choose a run mode here. Older runs never assess risk and keep the TDD workflow; every mode, Lightweight, and escalation rule in this skill applies only to adaptive runs.

After close-the-gaps saves the spec, judge the ticket's risk yourself — judgment, no rubric — from the accepted spec and what refinement already learned about the code: scope, dependencies, architectural impact, security, and uncertainty. Do not start a new investigation. **Low** → `mode: lightweight`; **Medium** or **High** → `mode: tdd` (the two run identically). Write `risk`, `mode`, `mode_source: assessed`, and a one-line `risk_rationale` naming the factors that drove the level.

A mode the user forced (`--mode` or an explicit chat request) wins: set it with `mode_source: user`, still record the assessed `risk`, and note the override and any disagreement in `risk_rationale` (e.g. `…; user forced tdd, assessed low`).

Log the result as a decision row (topic `Implementation mode`, per the workflow-decision audit), refresh the dashboard, then call `handoff.mjs next`. Guided shows it at Spec approval; Autonomous and Autopilot apply it without asking. On controller runs, the controller's `mode` event writes these fields and the row; apply it before the refinement handoff (or a reused spec's `context-ready`). Escalation and Lightweight fix rounds likewise use its events, never hand edits.

In Autopilot, also append this assessed mode to the initialized `implement` decision log using `kind: checkpoint` and `site: implementation-mode`. This records a policy assessment, so omit `question`, `options`, and `multiSelect`; those fields are allowed only for `askUserQuestion` entries. Use the actual selected mode and rationale, including any user override. For example:

```json
{"phase":"Risk assessment","site":"implementation-mode","kind":"checkpoint","chosen":"lightweight","rationale":"Assessed low risk: a display-only addition to an existing hover card, with no backend or billing changes."}
```

Pass the entry to the shared writer in its own tool call with the run's existing root and ticket, following `docs/autopilot-log-schema.md`. This log append is separate from the controller's state/Audit update; it does not replace or replay that update.

### Spec approval (Guided; every mode after a requirements conflict)

Show the spec path and, in an adaptive run, the assessed risk, mode, and rationale. Ask: **Approve** / **Approve with <the other mode>** (adaptive runs only) / **Redo this phase** (with notes) / **Stop**. The user may edit the spec file before approving; record `spec_hash` at the moment of approval. **Approve with <the other mode>** switches `mode` with `mode_source: user` and notes it in `risk_rationale`; the transition row records the choice.

On either approval, publish that exact accepted version if authorized, before advancing — to `lightweight` or `plan` by `mode` (an older run: Plan). A publication error leaves the artifact local and does not invalidate spec approval.

