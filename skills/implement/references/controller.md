# Scripted workflow checkpoints

New runs use `controller_version: 1`. Older runs keep their existing checkpoint and fingerprint rules; do not retrofit this field.

Resolve the controller to `<implement-base>/scripts/workflow.mjs`. After Start's autonomy, refinement-destination and branch-guard choices, save an initialization JSON object with `ticket`, `autonomy`, `refinement_destination`, `base`, explicit absolute `repos` (all affected Git roots), and a one-line `branch_guard` outcome. Use `offline_pending: true` for the pending-offline Start path. Run:

```
node <controller> init --root <artifact-root> --input <init.json>
```

This creates the state from the maintained template, captures plugin version, time and repository snapshots, and creates the dashboard. It refuses to overwrite a run. The branch guard still precedes initialization. The controller does not create a branch, choose product scope or grant publication consent.

Before every phase transition, run `inspect --root <root> --state <state>` and use its `state_hash` as `expected_hash` in a saved event JSON. Every event has a stable `id` (reuse that exact event on retry), `event`, and `repos`. Run `apply --root <root> --state <state> --input <event.json>`. Do not hand-edit phase/status, loop counters, audit transition rows or fingerprints on controller-enabled runs.

- `handoff`: supply the actual `handoff` path, optional `previous_review`, and `related_failures` after semantic triage. A human question is saved as a blocking pending input before returning; present its saved question/choices, then use `resolve-input` with the returned pending ID. Internal regression triage remains active work; only an actual unresolved human classification opens an input wait. A manual-walkthrough route also requires the walkthrough to have happened and `manual_evidence_complete: true`.
- `context-ready`: after the documented context check and artifact-reuse decision. For accepted reuse, supply `reuse_spec: true`; complete the existing reuse/hash checks first.
- `approve`, `redo`: compatibility events for a spec/plan gate that has no saved pending input. Guided entry to those phases now creates a Paused approval request automatically; answer that request with `resolve-input` instead. `skip-approval` is allowed only outside Guided and clears the approval wait without claiming user approval.
- `sync-complete`: after the finished final context sync; advances to final approval (or legacy completion).
- `complete`: checks the current final package, requiring its exact approval in Guided, before recording Complete.
- `mode` (adaptive runs): supply `risk`, `mode` (`lightweight`/`tdd`), `source: assessed|user` and a one-line `rationale`; a user source also needs `via: question|chat|flag`. Apply it after risk assessment and before the refinement handoff or a reused spec's `context-ready`, and again for a Guided override or a user's downgrade. Spec acceptance then routes by mode.
- `handoff` with `escalate: "<reason>"` (plus optional raised `risk` and `rationale`) applies a reassessment escalation; Lightweight review routes apply `fix` (counted against the fix limit) or `escalate` themselves. The controller sets `mode: tdd`, `escalations: 1`, resets review/fix counters and writes the `Escalation:` row without consuming a replan.
- `escalate`: an escalation without a stage handoff (e.g. a final-approval change that alters the approach, or the user's request with `source: user`, `via`); supply `reason`.
- `lightweight-fix`: a Lightweight run's final-approval **Request changes** with code feedback; supply `reason`, `source: user`, `via`. It enters `lightweight` as a counted fix round.
- `autonomy`: supply `mode`, `source: user`, `via: question|chat`. This saves/replaces `queued_autonomy` and adds a resume-transparent audit row while preserving effective `autonomy` and open inputs. Requesting the effective mode cancels the queue. The next phase transition applies and clears it, records that application and uses the new mode for next-phase approval gates. No step/batch or status-only boundary applies a queue. Completion drops an unused queue without relabeling validation. Preserve existing log history.
- `pause` or `stop`: supply the actionable `reason`.
- `resume`: supply the same repository roots and `blocker_resolved: true` only when the saved blocker was actually resolved. Changed repository snapshots fail; a requested “Resume anyway” still requires the existing explicit decision path and a fresh accepted baseline, not this ordinary resume event.
- `accept-workspace`: only after the existing explicit “Resume anyway”/artifact-edit decision, supply `source: user`, `via: question|chat`, and its `reason`. It records the accepted repository/artifact baseline without changing phase, counters or status. Then use ordinary Resume. Never infer this event from a mode change or a failed fingerprint check.

The helper owns plan-version/replan/fix/review counters, activity clearing at phase/stop boundaries, spec/plan content hashes, repository snapshots and the timestamped transition row. Snapshot fingerprints include untracked filenames, content and modes; every affected repo is checked. Plan hashes exclude Execution Status. Use these hashes only for controller runs; legacy hash definitions remain unchanged.

A dashboard failure preserves the saved event. Repair rendering, then retry the identical event; replay refreshes the existing dashboard without applying the transition twice. A missing dashboard on an old run is never backfilled. An outstanding `.lock` reports an interrupted/concurrent writer: check that writer before removing its lock. Errors stop dependent dispatch; never claim completion on a failed command.

Existing same-phase workflow decisions, narration, publication and delivery keep their specialized helpers. They must not rewrite controller-owned phase/counter fields. Product decisions and semantic regression classification remain with the model/user.

Activity checkpoints follow [activity.md](activity.md). Phase/status boundaries and blocking input waits clear both `current_activity` and its optional `current_activity_updated_at` timestamp. Same-phase decisions and ordinary renders preserve both. The activity helper owns timestamp capture; a dashboard render never invents a newer activity time.

## Pending input lifecycle

Once a workflow state exists, every blocking question or approval uses this lifecycle before the question is shown. Stage questions, uncertain human regression classification, inline step pauses and saved Slack/offline refinement waits all participate. Intake/autonomy/branch questions before the first state file exists retain Start's existing rules; there is no dashboard to update yet.

The state owns `pending_inputs`, an array of versioned JSON records in the field block. Each has a stable occurrence ID, kind, phase, concise question, offered choice IDs/labels (or an empty array for free text), blocking flag, recipient, real captured timestamp and any artifact binding. Multiple optional decisions may coexist with one blocking request. Missing metadata on older runs means no saved requests; never infer that an old question was answered.

Use `inspect` for the current state hash and saved requests. Save an event JSON, then run the existing `apply` command:

```json
{
  "event": "await-input",
  "id": "ask-mode-step-1",
  "expected_hash": "<inspect state_hash>",
  "pending": {
    "id": "mode-step-1",
    "kind": "question",
    "question": "How should this step run?",
    "choices": [{"id":"inline","label":"Inline"},{"id":"subagent","label":"Fresh subagent"}]
  }
}
```

`kind` is `question`, `approval`, `triage`, `step`, `slack`, or `permission`. Blocking defaults to true: the helper preserves phase/counters, sets Paused, clears activity and refreshes HTML. For a genuinely optional question, set `blocking: false`; its card remains visible while unrelated work continues. Do not declare a dependency-blocking choice optional to bypass it. Controller-run repository roots may be omitted on lifecycle events: the saved snapshot supplies them. Preserve explicit roots when newly affected repos join.

For an independent multi-question wave, use one request with a summary `question` and `questions: [{id,question,choices,multi_select?}, ...]`; leave its top-level choices empty. The HTML shows each component and its actual options. Resolve with an `answer` object keyed by those question IDs. Every applicable component must be answered before that wave resumes; full product answers still go in the stage artifact. Keep the existing dependency/wave limits rather than combining dependent questions.

Only after that checkpoint succeeds, show the saved question and choices, retaining each option's optional `description` when it explains consequences or authorization scope. A failed render preserves the request; retry the identical event to repair HTML without another timestamp/audit row. Do not issue dependent work or pretend the question was displayed successfully before repair.

After an actual user answer, apply `resolve-input` with `pending_id`, `answer` (an offered ID, array of IDs when `multi_select: true`, or nonempty free text), `source: user`, and `via: question|chat`. It validates the request, records resolution, clears that request and resumes/applies its saved continuation. Nonblocking answers preserve any other blocker and never change Complete or accept ongoing code edits into the baseline. Product free text stays in the stage's normal artifact; the audit records receipt rather than copying raw conversations or secrets.

For an automatic handoff question, the controller retains the handoff/hash and route options; answering routes that same result without a separate raw `--choice` call. A stage `needs_input` answer resumes that stage for a new handoff. For Guided spec/plan approval, `approve`, `redo`, and `stop` are the saved IDs. Existing user edits before spec/plan approval remain allowed and are hashed at acceptance; these informational artifact bindings are not final-package approval.

At final approval, build/show the package, then save `await-input` with `kind: approval`, its question and a new pending ID. The helper binds the current exact package and supplies the approval choices. Resolve `approve` only after the user's actual approval of that shown package: the controller stamps the exact package and checkpoints Complete. Do not repeat its completion checkpoint; run terminal feedback/publication/delivery hooks under the existing contract. A `redo` response clears the wait for the existing feedback/fix/replan path; it does not complete. A changed exact package rejects the old answer. After revalidation and rebuilding, use `refresh-input` with the old `pending_id` and a new `pending` record/ID; a stale binding permits reissue, while an unchanged request requires explicit user instruction. Supersession is audited, never fabricated as an answer.

Rejecting an approval (`redo` or `stop`) remains possible when its package is stale/unavailable; refusal never stamps approval or accepts a changed workspace baseline. A direct Stop cancels the current blocking request with an audited cancellation, not a fabricated answer, so the ordinary stopped-run Resume path remains usable. Refreshing a request still preserves ordinary workspace checks; unrelated source drift needs the existing explicit acceptance/revalidation path.

Slack/offline waits identify the Product Manager. Read-only reply lookup may occur while paused. A confirmed PM Slack response uses `source: pm`, `via: slack`, and its real `reply_reference`; a user's explicit answer-live/file-resume instruction uses user provenance. Never mark a PM reply received merely because a message was sent. Phase 5C still owns parsing, drift checks and source attribution.

Resume with a blocking request returns that same saved question and leaves Paused; `blocker_resolved: true` does not answer it. Mode requests preserve the effective mode, request and fingerprints, saving only `queued_autonomy`. The current phase must finish under its original policy, including its existing Guided approval. The next actual phase transition applies and clears the queue; it never supplies an answer to this request. A stage with a documented fixed default may save its exact `autonomy-policy.mjs` payload under `pending.policy` (options must match the offered choices); while that policy is already effective, `resolve-input` with the actual automatic source and `via: policy` asks that helper to select the permitted default. A queued mode cannot activate a policy for a current request. Unsupported/unsafe defaults remain unresolved or follow the skill's hard-stop path; mode alone never supplies missing facts.

The HTML renders question, choices, recipient, reference/hash, captured “pending since” time and live elapsed wait. It keeps refreshing while a request is open so an already-open page sees resolution. No response is submitted through this static HTML. Completed-run delivery choice/approval continues to use the delivery journal and existing delivery display: it must never set implementation Paused.

Older runs may use the same-phase input lifecycle without enabling the controller or changing legacy hashes. Their existing owning skill still applies phase/approval transitions and ordinary workspace checks after the answer; the pending helper does not migrate those runs or create a missing dashboard.
