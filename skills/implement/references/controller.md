# Scripted workflow checkpoints

New runs use `controller_version: 1`. Older runs keep their existing checkpoint and fingerprint rules; do not retrofit this field.

Resolve the controller to `<implement-base>/scripts/workflow.mjs`. After Start's autonomy, refinement-destination and branch-guard choices, save an initialization JSON object with `ticket`, `autonomy`, `refinement_destination`, `base`, explicit absolute `repos` (all affected Git roots), and a one-line `branch_guard` outcome. Use `offline_pending: true` for the pending-offline Start path. Only an explicit new-run `--refinement-worker` flag supplies `refinement_worker: true`; it is validated as local single-repository Autopilot and captures `refinement_worker_version: 1`. Ordinary initialization and saved runs do not gain this opt-in marker. Run:

```
node <controller> init --root <artifact-root> --input <init.json>
```

This creates the state from the maintained template, captures plugin version, time and repository snapshots, and creates the dashboard. It refuses to overwrite a run. The branch guard still precedes initialization. The controller does not create a branch, choose product scope or grant publication consent.

**Required startup presentation and continuation:** successful `init` returns
`startup_message`, a chat-ready **Open implementation dashboard** Markdown link,
and a structured `next_action` with `type: assistant_message`, the exact chat
`text`, and `delivery_status: not_sent`. The command only returns the message;
it has not delivered assistant chat. Run initialization by itself.
Immediately send `next_action.text` to user-visible assistant chat before any
further tool call, including activity checkpoints and reference reads. Use a
standalone assistant response with no tool calls, then finish that response. Stop
confirms the runtime text and automatically resumes the active run. For a
normal run, `continuation: continue_context_check_without_user_reply` then
continues into Context check in the same turn. If only tool calls/results have
occurred since init, the message remains unsent; emit it before the next tool.
This internal response boundary is not a workflow pause. Do not wait for
acknowledgment or ask whether to continue at the announcement. Tool output, thinking and `· summary` updates do not count as the
text block. For pending offline refinement, `continuation` is
`wait_for_offline_answers`: include the link in the existing stop message,
explain how to supply answers/resume, and keep that genuine pause.
Initialization failure produces no success announcement; report the error.
Use `inspect` later if full fields are needed. Ordinary refresh/resume does not
emit another startup link. No state field asserts that the user saw the link.

The skill-scoped startup hooks block immediately after successful init to require
the assistant chat action. Stop matches the exact clickable dashboard link in
its runtime `last_assistant_message`, which remains available when the transcript
has not flushed. A run-local `startup-confirmation.json` receipt binds that
observation to the session/transcript, initialization call, immutable start time
and dashboard; it contains hashes, not message text or an approval. Tool hooks
accept a matching receipt while the transcript catches up. An invalid or stale
receipt never grants confirmation. Legacy clients without runtime Stop text
retain the bounded transcript fallback. If a tool was denied after a link
streamed, finish the standalone response rather than repeating the link or
retrying tools. The normal announcement confirmation boundary is not counted as
a hook failure in workflow feedback. Stop still requires continuation of every
In Progress phase, and a receipt does not release premature-edit protection. Diagnostic
request dumps are not conversation events; a partially appended final JSONL line
is retried/ignored until it is complete. A genuine new user turn clears the fresh-start
obligation, preserving Resume behavior; synthetic hook feedback and diagnostic
request replays do not clear it.

An active background-agent wait is the exception to continuing in the same
turn: runtime launch evidence for an agent in the current Plan, Write Tests, Execute, Lightweight,
Review or Fix phase permits yielding until its completion notification. Keep
the saved workflow In Progress; do not manufacture a pause or completion. Do
not use shell sleeps, file watches or repeated polls to avoid Stop. The hook
restores the continuation hold when the runtime reports completion/failure or
an inventory shows the agent is no longer running. Earlier-phase agents and
assistant-authored waiting claims do not release the hold. Process the hand-back
and continue the documented stage when the session resumes.

Initialization returns an `implementation_baseline` for every approved repo;
this is immutable transcript evidence, not a new persisted state field. It covers
tracked, staged and untracked application changes and preserves pre-existing dirty
work. Workflow artifacts, .claude, docs and Markdown are excluded. Before the
first Execute/Lightweight audit entry, tool hooks report unexpected changes and
Stop rejects an early bailout even if a stop checkpoint refreshed workspace
fingerprints. Recovery tools remain available and no edits are rolled back.
Authorized implementation releases the guard for later fixes/replans. Older
initializers and offline waits retain compatibility. This is fresh-run detection,
not a shell sandbox or an artifact/Resume validation replacement.

`context-ready` returns a `next_action` with the exact next stage and its required
continuation. Follow that stage's skill; passing Context check does not authorize
application edits. Other pending-input and handoff continuation fields retain
their existing meaning.

Before every phase transition, run `inspect --root <root> --state <state>` and use its `state_hash` as `expected_hash` in a saved event JSON. Every event has a stable `id` (reuse that exact event on retry), `event`, and `repos` under the rules below. Run `apply --root <root> --state <state> --input <event.json>`. Do not hand-edit phase/status, loop counters, audit transition rows or fingerprints on controller-enabled runs.

### Repository roots for events

Supply `repos` as an array of absolute checkpoint Git roots for ordinary events, including `mode`, `handoff` and `resume`, even in a single-repository run. Only `pause`, `stop`, `await-input`, `resolve-input` and `refresh-input` can inherit roots from the saved workspace snapshot. `autonomy` may omit roots without inheriting them because it preserves repository fingerprints. Omission never authorizes new repository scope; Resume still requires explicit roots and fingerprint checks.

For example, save each event separately using the current inspected hash (inspect again after the mode event succeeds):

```json
{ "id": "assess-mode", "event": "mode", "expected_hash": "<current-state-hash>", "repos": ["/absolute/repo"], "risk": "low", "mode": "lightweight", "source": "assessed", "rationale": "Bounded change with known dependencies." }
```

```json
{ "id": "accept-spec", "event": "handoff", "expected_hash": "<new-current-state-hash>", "repos": ["/absolute/repo"], "handoff": "make-it-work/<TICKET>/<TICKET>-handoffs/gaps-1.json" }
```

### Event payloads

- `handoff`: supply the actual `handoff` path, optional `previous_review`, and `related_failures` after semantic triage. A human question is saved as a blocking pending input before returning; present its saved question/choices, then use `resolve-input` with the returned pending ID. Internal regression triage remains active work; only an actual unresolved human classification opens an input wait. A manual-walkthrough route also requires the walkthrough to have happened and `manual_evidence_complete: true`.
- `context-ready`: after the documented context check and artifact-reuse decision. For accepted reuse, supply `reuse_spec: true`; complete the existing reuse/hash checks first.
- `approve`, `redo`: compatibility events for a spec/plan gate that has no saved pending input. Guided entry to those phases now creates a Paused approval request automatically; answer that request with `resolve-input` instead. `skip-approval` is allowed only outside Guided, except that a spec revision after `spec-conflict` always requires explicit approval. It clears an otherwise optional approval wait without claiming user approval.
- `sync-complete`: after the finished final context sync; supply `context_updated` as an array of every changed documentation/map/report path (relative to artifact root, including `../repo/` paths for approved sibling repos), or `[]` when none. Paths must resolve to existing files in approved repos. The controller merges/deduplicates these with earlier stage updates before advancing to final approval (or legacy completion). For `review_scope_version: 1`, it first checks the full delivery diff against the bound review evidence. Scope changes return to Review with a new review cycle and a `next_action`; unchanged coverage advances normally. The existing review cap applies, without incrementing fix/replan counts. Omitting the field retains legacy compatibility; new stage calls must supply it. Replaying the same event does not duplicate updates.
- `refresh-review`: for an active final-sync/final-approval run with `review_scope_version: 1`, rechecks actual delivery scope and returns drifted content to Review before packaging. It refuses an unchanged reviewed tree and preserves fix/replan counts. It cannot reopen Complete.
- `review-context`: in active Review, after bounded maintenance of known documentation/map gaps, supply `context_updated` (paths or `[]`) and the repository roots. Records the context paths and preparation for this review cycle without changing phase or counters. New `review_context_version: 1` runs require this before review-scope preparation. Unknown new gaps may still require final-sync edits and renewed review; this checkpoint does not waive coverage checks.

  For `review_context_version: 2`, also provide `test_map_maintenance`, one record per approved repo: `{ "repo": "/approved/root", "status": "maintained | blocked | not-applicable", "affected_tests": ["test/feature.test.js"], "reason": "actual result, uncertainty or concrete blocker", "evidence": ["make-it-work/TICKET/map-maintenance.txt"] }`. A current Test Map strategy requires maintained mappings or an evidenced blocker. Maintained records validate the map and presence of declared affected tests and the generated map report; the helper does not certify semantic completeness or freshness. Records and evidence hashes persist in state. Review preparation, Final Sync and packaging recheck them. Final Sync can supply a fresh array after new edits. A blocked scope affecting gate/review assumptions must still stop; nonblocking incomplete onboarding remains disclosed, never silently stamped fresh.
- `complete`: checks the current final package, requiring its exact approval in Guided, before recording Complete. Eligible completion and retry-limit stop checkpoints return `next_action.type: feedback`; follow it inline before the terminal summary or delivery question. Keep the checkpoint's structured output intact instead of projecting only phase/status. Replaying the event retains that handoff. Feedback leaves the workflow terminal; an analysis/write failure must be explicitly reported through the feedback reference's unavailable outcome.
- `mode` (adaptive runs): supply `risk`, `mode` (`lightweight`/`tdd`), `source: assessed|user` and a one-line `rationale`; a user source also needs `via: question|chat|flag`. Apply it after risk assessment and before the refinement handoff or a reused spec's `context-ready`, and again for a Guided override before leaving spec acceptance. Once Plan or later work has started, TDD-to-Lightweight is rejected atomically; resume the existing route or explicitly start a fresh run. Spec acceptance then routes by mode.
- `handoff` with `escalate: "<reason>"` (plus optional raised `risk` and `rationale`) applies a reassessment escalation; Lightweight review routes apply `fix` (counted against the fix limit) or `escalate` themselves. The controller sets `mode: tdd`, `escalations: 1`, resets review/fix counters and writes the `Escalation:` row without consuming a replan.
- `escalate`: an escalation without a stage handoff (e.g. a final-approval change that alters the approach, or the user's request with `source: user`, `via`); supply `reason`.
- `lightweight-fix`: a Lightweight run's final-approval **Request changes** with code feedback; supply `reason`, `source: user`, `via`. It enters `lightweight` as a counted fix round.
- `autonomy`: supply `mode`, `source: user`, `via: question|chat`. This saves/replaces `queued_autonomy` and adds a resume-transparent audit row while preserving effective `autonomy` and open inputs. Requesting the effective mode cancels the queue. The next phase transition applies and clears it, records that application and uses the new mode for next-phase approval gates. No step/batch or status-only boundary applies a queue. Completion drops an unused queue without relabeling validation. Preserve existing log history.
- `spec-conflict`: from planning/implementation/review/sync, supply `reason` naming the spec criterion, evidence and required decision (plus the preserved spec revision path/hash). Pauses at `close-the-gaps`, retains `spec_previous_plan`, invalidates execution/review/readiness and advances plan version if a prior plan existed. Resume requires explicit user guidance (`source: user`, `via: chat|question`, `blocker_resolved: true`). Refinement must record the resolution; the returned spec enters mandatory explicit approval in every mode. Neither Autopilot nor `skip-approval` may accept this revision. Pass the previous plan and refinement resolution when rebuilding.
- `pause` or `stop`: supply the actionable `reason`; roots follow [Repository roots for events](#repository-roots-for-events).
- `resume`: supply the same repository roots and `blocker_resolved: true` only when the saved blocker was actually resolved. Changed repository snapshots fail; a requested “Resume anyway” still requires the existing explicit decision path and a fresh accepted baseline, not this ordinary resume event.
- `accept-workspace`: only after the existing explicit “Resume anyway”/artifact-edit decision, supply `source: user`, `via: question|chat`, and its `reason`. It records the accepted repository/artifact baseline without changing phase, counters or status. Then use ordinary Resume. Never infer this event from a mode change or a failed fingerprint check.
  Before implementation, an exact user-approved branch switch/fast-forward may additionally supply `branch_baseline: [{"root":"/absolute/repo","from_head":"<saved-full-SHA>","to_head":"<approved-full-SHA>","branch":"<approved-branch>"}]`, naming every saved repo. Preview these exact targets before approval. The controller validates current targets, fast-forward ancestry and unchanged local application edits, then records the accepted guard baseline. Generic acceptance or a Continue decision never resets the guard. Existing runs without the saved baseline retain their original protection; do not retrofit it or hand-edit a baseline.


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

`kind` is `question`, `approval`, `triage`, `step`, `slack`, or `permission`. Blocking defaults to true: the helper preserves phase/counters, sets Paused, clears activity and refreshes HTML. For a genuinely optional question, set `blocking: false`; its card remains visible while unrelated work continues. Do not declare a dependency-blocking choice optional to bypass it. Controller-run roots follow [Repository roots for events](#repository-roots-for-events).

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


## Workspace runs

Apply [workspace.md](workspace.md) before Start. The controller requires an applied, exact user-approved workspace selection when the artifact root is not the selected Git root or multiple repos are supplied. It persists `workspace_version: 1` and `workspace_contract`; per-repo bases/branches govern new workspace runs. Single-repo initialization retains the existing inputs and behavior. Do not migrate legacy states.

Every checkpoint must retain the approved repository set and branches. `context-ready` checks context independently in each selected repository. `scope-update` is an explicit user event after a paused run's revised selection has been approved/applied. Supply the full `repos`, `source: user`, `via: chat|question`, and `reason`. It installs the revised contract, increments plan version, invalidates readiness/execution/review and returns to context-check; retain and revalidate the spec. Replanning must use a fresh artifact filename to preserve prior evidence. Completed runs reject scope updates.

## Lightweight fix evidence

Completed `implement` handoffs in Lightweight fix rounds (`fix_cycle > 0`) require the saved report/audit diagnosis checkpoint described in [lightweight-fix.md](lightweight-fix.md). It binds the current round to its accepted spec and fix source. Initial implementation and blocked handoffs do not require it. Checkpoint and inspect before the fresh fix-agent dispatch; handoff validation cannot retroactively establish correct ordering or prove dispatch.

## Delivery-aligned review

New runs carry `review_scope_version: 1`. Before each independent-review dispatch,
run `review-scope.mjs prepare --root ROOT --state STATE` and pass its exact target
path and hash to the reviewer. The helper and final package use the shared
`scripts/lib/delivery-scope.mjs` snapshot: full branch-to-base diffs, all approved
repo roots/bases and tracked/untracked content, excluding `make-it-work/`.
The review renderer binds report evidence to this target. A clean review handoff
must match both that snapshot and the current delivered paths; narrower or stale
evidence cannot advance the controller. The package rechecks coverage and exact
repo/base selection, and hashes the target/diff artifacts as evidence. Hashes
establish scope/freshness, not proof of semantic inspection. Review grants no
delivery permission. Older saved runs without the marker retain legacy behavior.

### Scope reconciliation before review

Fresh runs additionally carry `review_reconciliation_version: 1`. After the
existing review-context maintenance, run:

```sh
node <implement>/scripts/review-scope.mjs inspect --root ROOT --state STATE
```

This read-only report compares the original review baseline, current full
delivery diff, literal per-repo Affected Code entries and maintained context.
Lightweight uses controller-retained changed-path hints bound to its accepted
implementation report/spec instead of inventing a plan. None proves authorship.
Files with starting local edits remain ambiguous even when planned. Inherited
commits are separate items; a specifically approved workspace starting SHA/base
can cover those original commits, never newly exposed history or later changes.

Treat this report as advisory. Show paths, provenance, inherited commit counts
and sensitive names without their contents. In Guided and Autonomous, consolidate
material ambiguity into one optional consultation with **Continue with the full
scope** and **Adjust scope** choices. Continuing requires no per-item receipt and
must remain available when analysis is incomplete. Use the existing nonblocking
input mechanism if retaining an asynchronous question; never create a blocking
request solely for these advisories. Reuse earlier specific answers while the
facts remain the same. Do not ask again merely because another review cycle began.

In Autopilot, continue under existing authorization with the full delivery scope
and disclose unresolved provenance and the assumptions used. Advisory uncertainty
alone does not require a question or stop. An actual conflicting instruction or
operation outside existing authorization still follows its existing approval path.
No mode may silently discard tracked/mixed work or inherited commits, invent user
consent, or treat relevance hints as proof of authorship or correctness.

Optional user decisions can be recorded with
`review-scope.mjs reconcile --root ROOT --state STATE --input decisions.json`:

```json
{
  "source": "user", "via": "question", "fingerprint": "<current inspect fingerprint>",
  "decisions": [{ "id": "<listed item id>", "action": "include",
    "reason": "Why this complete item belongs in delivery", "reference": "Actual user answer or prior decision locator" }]
}
```

This helper validates its explicit input and writes a run-bound local journal in
active Review preparation. It is never a prerequisite for `prepare`, review or
packaging. Repeated choices are reused for the same facts; `action: "revoke"`
optionally records a changed answer without editing the checkout. Defaults
preserve recorded inclusions. A later explicit `exclude-preexisting` path choice
can supersede inclusion directly, without a separate revocation step, for files
still proven unchanged and untracked. Tracked/history separation still requires
separately authorized checkout handling; no automatic stash, reset, rebase,
deletion or path narrowing is added.

`prepare` creates the full target even with unresolved advisories or unavailable
analysis. Its `scope_reconciliation` freezes the available advisory context for
the reviewer; missing/malformed provenance or decision journals produce warnings
and unknown provenance, never fabricated history. Advisory changes alone do not
invalidate review or packaging. Actual delivery-diff changes, incomplete review
coverage, correctness findings and existing operation approvals retain their
checks. Older saved runs keep their existing target/package contract.
Preparing again with the same delivery scope and required review context retains
the frozen target bytes; the returned advisory summary can still reflect later
choices. Refreshing advisory metadata alone never requires another review.

**Pre-existing untracked files.** New runs use the consolidated discussion above;
do not ask again for resolved items. Older contracts discover eligible files with
`review-scope.mjs preexisting --root ROOT --state STATE`. It lists untracked
files that were untracked in the saved review baseline and remain untracked with
the same file type, bytes/link text and executable mode (helper scripts, notes, skills,
docs, backups and local dotfiles); `sensitive` flags credential-like and hidden
names. This establishes unchanged starting content, not authorship. `prepare`
also returns any that remain as `preexisting_untracked`. When the list is
non-empty, show the count, the sensitive names and a short sample, then ask once
in Guided and Autonomous whether to keep them out of review and delivery
(recommended) or include them; Autopilot keeps them out without asking. To keep
them out, run `review-scope.mjs exclude-preexisting --root ROOT --state STATE`
(optionally `--input` with `{"paths": [...]}` for a subset). It adds a marked
block to each repository's local `.git/info/exclude`, which is never committed,
so review, the final package, change assessment and delivery all omit them
consistently. Record the choice in the decision log and tell the user the block
can be deleted after the run. Never pass a file the helper did not list, never
print the contents of a sensitive file, and never let a reviewer read one.
On new runs, default exclusion preserves recorded inclusions. To exclude a
previously included file after a later user instruction, pass its explicit path
directly; no separate revocation or second question is needed.
New runs have `review_baseline_version: 1` and an independent `review_baseline`
bound to the ticket/start time. It captures Git-visible changed tracked and
untracked paths, file hashes/modes and repository HEAD/branch at initialization,
including Markdown, `docs/` and `.claude/`; ignored files and `make-it-work/` are
not inventoried. No file contents are saved. Resume, replans and branch-baseline
acceptance retain this provenance. Scope updates capture only newly selected
roots; retained (or reselected) roots keep their original evidence, and removed
roots are not exclusion targets. Do not reset this baseline to repair a mismatch.
Tracked changes, modified starting files and files first appearing after capture
are not automatically excluded. Disclose unexpected paths before dispatch;
the plan's Affected Code is a signal, not an exclusion allowlist.

Older saved runs without the marker retain their implementation-baseline
fallback, which omitted Markdown, `docs/` and `.claude/`. Explain that limitation
when relevant; absence from their list does not establish a file was created
during the run. Never manufacture a starting baseline at resume. A missing,
malformed or cross-run baseline on a version-1 run is an advisory warning with
unknown provenance. Continue full-scope review without falling back to a legacy
list or automatically excluding files. Capture failures likewise do not prevent
initialization or scope updates; never recapture old roots to invent evidence.

## Execution settings and unavailable supplemental checks

Before the first per-step dispatch, apply `execution-mode` with `mode: subagent-driven|inline`, `source: user`, `via: chat|question`. Inline also needs `pause_mode: run-straight-through|stop-after-each-step`. Autonomous/Autopilot may select only the recommended `subagent-driven` default with `source: policy`, `via: policy`. The controller updates the plan's Mode/pause settings and persists the state fields and audit decision. Replaying repairs the checkpoint; conflicting mode changes are rejected. Do not use a generic decision checkpoint to set state fields. Existing plans with a chosen matching mode are supported.

If the user explicitly authorizes proceeding without unavailable supplemental manual checks, apply `waive-manual-verification` with normal event ID/hash/repos plus `source: user`, `via: chat|question`, a one-line `reason`, and `scenarios: ["M1", "M2"]` naming every manual Test Plan scenario. This is limited to the final `Verify manual scenarios` step, with no implementation files and all previous steps complete. A stopped execution may resume this way without editing or accepting a new plan baseline. Changed plans/workspaces, correctness stops, failed gates, blocking inputs and all-manual policies cannot use this route.

The controller records a plan-version/hash-bound authorization and resumes Execute; it does not advance to Review or claim verification. Next run step-control's `waive-manual` action with that controller state and ledger, then run Execute's normal completion gate. Skipped checks remain `skipped` with user provenance; dependent ACs remain `unverified`. The unchanged plan and original stop history are retained. Completion Progress means the step was processed, not that skipped checks passed; disclose the skipped checks in the execute report and final package. A passing automated gate is still required by the ordinary passing route.

## Safe initialization and helper paths

Resolve `<plugin-root>` once from the loaded skill directory; shared helpers such as `scripts/context-inventory.mjs` are under the plugin root, while `workflow.mjs` and `testing-readiness.mjs` are under `skills/implement/scripts/`. Check the resolved file exists before invoking it. Write payloads with a structured JSON writer (`JSON.stringify` or Python `json.dump`), not platform-sensitive `sed` replacement; inspect successful controller output before issuing dependent operations. `refinement_destination` accepts only `here`, `slack-draft`, or `slack-send`; reusing a spec does not introduce another value.

A fresh run may explicitly retain prior verification decisions using `source: user`, `via: chat|question`, and `retained_verification: [{"decision":"<accepted limitation>","reference":"<prior user decision>","unverified":["<unobserved criterion>"]}]` on `init`. Omit this input unless the user explicitly chose retention. It preserves context only: it never transfers tracker consent, marks scenarios verified, or changes the new run's verification policy. Frozen review targets carry these decisions alongside the current policy and its source hash in `verification_context`; changing that context requires a new target and review. Older targets without this optional context retain their existing behavior.

Keep controller stdout intact for runtime discovery. Do not pipe it through `head`, truncate it, or rename its keys. To reduce output during feedback inspection, use the supported `write-feedback.mjs inspect --compact` command rather than a shell projection.

## Test preparation (new runs)

`test_writing_version: 1` adds phase `write-tests` after accepted Plan and nonempty fix amendments, before Execute. Guided Plan approval precedes this phase. Readiness is checked before entering it. The coordinator preauthorizes exact tests and dispatches a fresh write-the-tests worker without inherited conversation history.

After a real handback, apply `preparation-saved` with `preparation: <root-relative JSON path>` and the normal event ID/hash/repos. This validates current plan binding and newest evidence and derives its readable report link, including a blocked partial report. It does not advance the stage or implementation Progress. Then apply the validated `tests` handoff to enter Execute; ready/not-applicable evidence is required, and stale or changed prepared files block transition. Earlier numbered reports remain historical. Legacy states retain prior routing without marker backfill.
