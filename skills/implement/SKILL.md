---
name: implement
description: "Orchestrates the make-it-work pipeline for one ticket — context check → close-the-gaps → plan-the-work → execute → review-the-pr → final context sync — with saved, resumable workflow state, Guided, Autonomous, and unattended --autopilot modes, capped fix/replan loops, and local end-of-run workflow feedback. Never commits implementation changes, pushes, opens a PR, or uploads feedback. Use when taking a ticket from request to a reviewed, context-synced implementation in one run."
disable-model-invocation: true
---

# Implement

**Role:** Act as a thin orchestrator for the make-it-work pipeline.

**Goal:** Take one ticket from request to a reviewed, context-synced implementation by running the existing stage skills in order. `implement` decides which phase runs next, runs that stage skill, interprets the outcome it reports, records the transition, enforces the loop limits, and performs the final context sync. It never redoes a stage's own reasoning — refinement belongs to `close-the-gaps`, planning to `plan-the-work`, implementation to `execute`, review to `review-the-pr`.

**Autonomy changes:** Before Start or Resume, read [references/autonomy-changes.md](references/autonomy-changes.md). Keep this contract active during inline stages; the latest explicit chat selection overrides the startup flag.

**Ticket updates:** For an explicitly supplied tracker ticket or a run with a saved `ticket_publication` journal, read [references/ticket-publication.md](references/ticket-publication.md) at Start/Resume and keep it active through the run. `implement` alone publishes accepted specs, plans (attachments or authorized comment fallback), significant blockers, completion/review/verification summaries and one final Jira HTML dashboard attachment through available connector capabilities, under a separately saved, explicit consent. Autonomy never grants ticket-write permission. Local spec/pasted-content runs stay local unless the user explicitly supplies a tracker destination.

**Pipeline checkpoint:** Before editing implementation code or tests, carry out Start's branch guard and create the ticket's workflow state and dashboard, then enter Context check. Follow the saved phase transitions and required stage skills through review and final sync. The size or apparent simplicity of a code change never waives a phase, handoff, log, or review. If a required stage cannot run, checkpoint its documented stop in the state instead of implementing the ticket directly. Do not report a ticket as complete merely because its code and tests pass; `status: Complete` requires the pipeline's terminal checks.

---

## Usage

```
/make-it-work:implement [TICKET-ID | path/to/spec.md] [--autopilot]
```

Or paste the ticket content directly into the chat after invoking.

- **`--autopilot`** — strip this flag before resolving the ticket or spec path. It selects Autopilot without the initial autonomy question. This flag alone leaves ticket updates off; an explicit scoped instruction or the same run's saved consent can authorize publication. Both interactive Autopilot choices use the same execution policy: no `AskUserQuestion` calls during implementation, and `--autopilot` forwarded to every dispatched stage. After a package-enabled run is Complete, the optional delivery offer is the one exception: it always asks, but never delays or changes the completed result. It never commits, pushes, opens a PR, invokes `go-deep`, or guesses through a missing/contradictory required fact; those cases checkpoint a `Stopped` state with an actionable reason. Testing readiness may configure minimal test tooling and follow `define-test-strategy` inline before planning.
- **Ticket key or pasted content** — derive `<TICKET>` exactly as `close-the-gaps` Phase 1 does: the ticket ID; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD`.
- **Spec path** — `<TICKET>` is the file name without its `-spec.md` suffix.
- **No argument** — list `make-it-work/*/*-state.md` files whose `status` is not `Complete`. Exactly one → offer to resume it; under `--autopilot`, resume it only when its saved autonomy is `autopilot` and its workspace fingerprints still match. Several or none → ask the user; under `--autopilot`, stop with the matching no-safe-default reason. Ignore flat artifacts from runs started before the per-ticket layout.

## Autopilot mode

While the current autonomy is `autopilot`, construct every later ordinary implementation question/checkpoint payload exactly as the interactive path would, but do not call `AskUserQuestion` or wait during implementation. `--autopilot` and Start's autonomy question select the initial mode; a later explicit chat request follows **Change autonomy during a run** below. Completion's optional delivery offer happens only after the run is terminal and is always asked, including in Autopilot. Append each orchestration-level resolution with the shared schema in `docs/autopilot-log-schema.md`. When `--autopilot` is supplied and `<TICKET>` is known, initialize `make-it-work/<TICKET>/implement-autopilot-log.jsonl` fresh before Start's existing-run check, so a hard stop there can still be logged, unless an explicit mode-change request in this message overrides the flag; that request uses the reference's log-preservation rule. When Autopilot is selected interactively for a new run, initialize it immediately after that choice, before the branch guard. Log the autonomy selection as the first resolution in either case; the rationale must distinguish a user's selection from a flag-selected default. Use `node "<base>/../../scripts/decision-log.mjs" init|append implement --root "<repo-root>" --ticket "<TICKET>"` in its own Bash call when Bash is available; a denied log write never blocks unrelated pipeline work.

Auto-resolve only these safe defaults: create the suggested ticket-named feature branch when starting on the base branch; retain a clean resumable autopilot run's saved mode; establish the recommended minimal test setup before planning; continue with clear related/unrelated regression classification; choose sequential dispatch; and replan when the existing Autonomous rules already prescribe replan. Honor an explicitly selected manual verification policy without asking again; never infer it from unavailable automated results. Forward `--autopilot` to `close-the-gaps`, `define-test-strategy` during readiness, `plan-the-work`, `execute`, and the Review dispatch; `execute` forwards it to `run-regression` for its automated completion gate.

Stop, record `chosen: null`, set `status: Stopped`, clear `current_activity`, regenerate the dashboard, and report the remediation when there is no safe default: no ticket or several resumable runs, detached HEAD, an existing completed/stopped run or standalone artifacts that would need a reuse/overwrite choice, changed worktree on resume, unresolved TBDs or plan blockers, uncertain regression ownership, an unavailable regression result, a review `Route: human` finding, or any stage's own hard stop. A normal terminal feedback retrospective never re-opens a successful run: write the best available share-safe diagnosis and retain material uncertainty in `openQuestions` rather than asking follow-ups.

At the terminal report, summarize auto-resolved decisions and the implement log path in addition to the normal completion/stop summary.

## Change autonomy during a run

Apply [references/autonomy-changes.md](references/autonomy-changes.md) throughout the run. An explicit chat request such as "switch to Guided", "switch to Autonomous", or "switch to Autopilot" changes the current ticket's mode without restarting the task. The latest explicit request takes precedence over the saved mode and the invocation's initial `--autopilot` flag. Save the change and refresh an existing dashboard before confirming it; use the current mode before every question, dispatch, and handoff route. A mode change alone never supplies a missing product answer or approves delivery.

---

## Stage skills

The stage skills are siblings of this skill in the plugin. Take the `Base directory for this skill:` path printed when this skill loaded, and resolve:

- `<base>/../close-the-gaps/SKILL.md`
- `<base>/../plan-the-work/SKILL.md`
- `<base>/../execute/SKILL.md`
- `<base>/../review-the-pr/SKILL.md`
- `<base>/../define-test-strategy/SKILL.md` — only for testing readiness, including refresh after setup

Read each one with the Read tool when its phase starts — **never** start them through the Skill tool; they are deliberately user-invoked only outside this orchestrator. Follow each skill's instructions including its `## When run by implement` section, passing the inputs that section names.

- Pass the exact **workflow state path**, even for an older run without a dashboard, and the current autonomy to each stage. The workflow state path does not authorize dashboard backfill. Inline stages share this session's autonomy-change handling; dispatched subagents do not own it.
- Refinement, planning, and execution run inline in this session; while the current mode is `autopilot`, pass `--autopilot` so their own decision policies replace questions while `execute` dispatches its own per-step subagents. Recompute this from the saved mode for each dispatch, including nested regression; do not reuse the invocation's original flag after a change.
- Review runs in a fresh subagent, for an independent read of the change (see Review dispatch).

If a required stage file is missing, stop and tell the user the exact path that could not be found. Do not improvise the stage.

The feedback retrospective's detailed contract is in `<base>/references/feedback.md`. Read it only after an eligible run has already reached its terminal state; ordinary in-progress phases do not need it.

For runs with `handoff_version: 1`, also read `<base>/references/handoffs.md` before the first stage. Each stage produces the versioned JSON result described there. Validate it and run the read-only `handoff.mjs next` helper after the stage; use its action to select the next phase or question. The Transition table below still specifies the side effects of each route and remains the compatibility path for older runs.

---

## Workflow state

For a new run, create the real directory `make-it-work/<TICKET>/` under the artifact root and put all ticket-scoped artifacts there. Keep the existing `<TICKET>-` filenames inside that directory. Do not move or resume flat artifacts from older runs. The run's state lives in `make-it-work/<TICKET>/<TICKET>-state.md`, next to the other pipeline artifacts. Create it with exactly this template:

````markdown
# Workflow state — <TICKET>

```
ticket: <TICKET>
handoff_version: 1             # new runs use validated JSON handoffs; absent on older runs
status: In Progress            # In Progress | Paused | Stopped | Complete
phase: context-check           # context-check | close-the-gaps | spec-approval | plan | plan-approval | execute | review | fix-plan | final-sync | final-approval | complete
final_package_version: 1       # new runs build a content-bound final package; absent on older runs
verification_version: 1        # new runs persist per-step and AC evidence; absent on older runs
autonomy: guided               # guided | autonomous | autopilot; legacy interrupted runs may still have pending
start_time: none                # ISO 8601 UTC timestamp captured when the state file is first created; never fabricated or backfilled
plugin_version: none            # exact version from this plugin's .claude-plugin/plugin.json, captured once at Start; never changed or backfilled
execution_mode: none            # none | subagent-driven | inline — set once execute's Mode-selection phase runs
inline_pause_mode: none         # none | stop-after-each-step | run-straight-through — set only when execution_mode is inline
spec: none
spec_hash: none
plan: none
plan_version: 1                # 1 = the initial plan; each replan adds 1
plan_hash: none
testing_readiness: none         # readiness artifact path, resolved within Plan before stage planning
execution: not-started         # not-started | running | passed | verified-manually | guardrail | retry-limit | gate-failed | gate-no-result | stopped
review: not-started            # not-started | clean | fix-required | replan-required | human-decision
review_cycle: 0                # reviews run for the current plan version (limit = fix_cycle's limit + 1 = 4 — one initial review plus one re-review per fix-plan round)
fix_cycle: 0                   # fix-plan rounds for the current plan version (limit 3 — review_cycle's limit is derived from this one, see its own comment)
fix_plan_round_steps: none      # step count added by the current fix-plan round; reset to none when a new fix-plan round begins
fix_plan_dispatch: none         # none | sequential | parallel — dispatch order for the current fix-plan round's own added steps; reset to none when a new fix-plan round begins; never set for the original plan's own steps
replans_used: 0                # limit 2 per run
gate: none                     # none | full-suite | scoped | scoped+full
pause_reason: none
branch: <current branch>
base: <base branch>
head: <commit hash>
worktree_fingerprint: <hash>
execute_report: none           # path of the last saved execute report
context_updated: none
ticket_publication: none        # this run's publication-journal path; none/missing means no tracker writes
current_activity: none          # one-sentence, high-level description of what's actively being done right now; none while not In Progress, or before the active phase's first narrated sentence
real_rows_from: 1               # Audit-log row number of the first row with a real (post-upgrade) timestamp; 1 for any run created under this feature. Set only by Resume, for a run whose state file predates this feature (see Resume).
```

## Known regressions

None

## Decided findings

None

## Context discoveries

None

## Audit log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |
````

**Checkpoint rule** — at every transition, rewrite the field block and append one row to the Audit log *before* starting the next phase. Immediately before that state-file write, capture the timestamp from the host clock with `date -u '+%Y-%m-%dT%H:%M:%SZ'` and copy that exact output verbatim into the row's `Time` cell. Do not use the session clock, infer a time, reuse an earlier capture, estimate, or back-fill a timestamp; the capture must be the final pre-write operation for that checkpoint, including the first row a run ever logs. This keeps the log aligned with the local clock that renders the dashboard. After every phase that changes files (close-the-gaps, plan, fix-plan, execute, final-sync), re-record `head` and `worktree_fingerprint`. Whenever the user edits the spec or plan by hand at a pause, re-record `spec_hash` / `plan_hash` before the next phase starts. Immediately after rewriting the field block, also regenerate `make-it-work/<TICKET>/<TICKET>-status.html` from the fields just written — never let the two fall out of sync (see Progress dashboard below).

**Fingerprints:**

- `head` = `git rev-parse HEAD`.
- `worktree_fingerprint` = `git hash-object --stdin` over the concatenated output of `{ git diff HEAD --binary -- . ':!make-it-work'; git ls-files --others --exclude-standard -z -- . ':!make-it-work' | xargs -0 -I{} git hash-object {}; }` — the tracked diff's bytes, followed by one `git hash-object` line per untracked file in `git ls-files`'s stable sorted order, all piped through a single final `git hash-object --stdin` call. This is one exact, reproducible pipeline, not two separate hashes to combine by hand — so an edit inside a new, untracked file changes the fingerprint too, and the same repo state always produces the same fingerprint.
- `spec_hash` = `git hash-object <spec>`.
- `plan_hash` = the same, over the plan with its `## Execution Status` section (from that header to the next `## ` header) removed — `execute` owns and updates that section.

**Base branch** — `base` is the branch this work will merge into: `git symbolic-ref --short refs/remotes/origin/HEAD` without its `origin/` prefix, or `main` when that fails. Show it in the start summary so the user can correct it.

---

## Progress dashboard

Alongside the state file, maintain a human-readable static snapshot at `make-it-work/<TICKET>/<TICKET>-status.html`. Create it immediately after the first state-file write on Start → New run or Start → Pending offline refinement, then regenerate it after every later state mutation named by the Checkpoint rule or by a phase-specific instruction.

Dashboard rendering is deterministic code, not model-authored HTML. All ordinary dashboard refreshes must use the checkpoint helper — never edit a state field and then separately remember to invoke the renderer. Resolve `<base>` to this skill's directory exactly as in Stage skills, then run:

```sh
node "<base>/scripts/dashboard-checkpoint.mjs" render --state "make-it-work/<TICKET>/<TICKET>-state.md"
```

For a narration/activity update, use the helper's one operation instead of manually writing `current_activity`: `node "<base>/scripts/dashboard-checkpoint.mjs" activity --state "make-it-work/<TICKET>/<TICKET>-state.md" --activity "<exact narrated sentence or none>"`. The helper validates the state, replaces `current_activity` atomically, renders the dashboard, and restores the prior state if rendering fails. State transitions and Audit-log edits still use their existing write procedure, followed by the helper's `render` operation.

The renderer owns parsing and validating the state and current plan, calculating timing and loop-aware timeline state, escaping state-derived content, reading the fixed logo and HTML template from this skill's assets, and atomically replacing `<TICKET>-status.html`. Never reproduce, patch, or hand-edit the generated HTML. Its inputs are the workflow state, the plan while step progress is needed, and, after completion, the optional delivery plan/progress journal. Delivery never changes implementation's Complete status, loop counters, or elapsed time. Its own journal drives the Deliver dot, repository results, timestamps and links; its helper regenerates existing dashboards after delivery checkpoints.

**Never backfill** — when Resume finds a run with no status file, do not invoke the renderer merely to add one. Only tickets whose state file was first created through one of the two creation paths above participate in dashboard updates. Once a participating ticket has a dashboard, every required regeneration uses the same command.

**Renderer failure** — a nonzero exit means the state or referenced plan violates the dashboard contract, or the dashboard could not be written. Do not enter the next phase and do not append a transition row describing progress that did not occur. Report the renderer's error, correct the source state/plan when the correction is unambiguous, and rerun the command. Because the renderer writes atomically, an existing dashboard remains intact on failure.

**Logging a decision row:** whenever an `AskUserQuestion` resolution or an explicit chat autonomy change represents a consequential in-run decision that is *not itself a phase change* (a phase change already produces its own ordinary row — never double-logged as a decision row too), append an Audit-log row with `From` and `To` both equal to the current phase, and an `Outcome / reason` starting with `Decision: `. Examples: the execution-mode choice and the inline-pause-mode choice (Execute), a fix-plan round's added-step count (Fix), and a fix round's Sequential-vs-Parallel dispatch choice. Start's autonomy and branch choices happen before the state file exists; include both in its first transition row instead.

Mention the dashboard path once, in whichever of Start's two creation points creates the state file first for this ticket (New run's first chat message, before Context Check; or Pending offline refinement's stop message). Never repeat it at later checkpoints, and never mention it for Resume.

---

## Narration

Before any stretch of work that involves several tool calls with no natural pause point in between — reading multiple files to investigate something, writing and running a batch of tests, applying a fix and re-verifying it — say one plain sentence describing the high-level activity about to happen, then proceed without further narration until that chunk's natural conclusion. Not a sentence per tool call, and not a sentence per tiny sub-step — just enough that the user always knows what's currently happening without having to infer it from a string of tool calls.

Each such sentence must use the dashboard checkpoint helper's `activity` operation to update the state file's `current_activity` field and regenerate the dashboard, so the same "what's happening right now" signal is visible to someone reading the dashboard async, not only someone reading live chat:

- `current_activity` holds exactly the sentence just said in chat, or `none`.
- Clear it back to `none` the moment a new phase becomes the active phase, before that phase's own first narrated sentence lands — a sentence from a finished phase must never linger under the next phase's dot.
- Clear it back to `none` whenever `status` moves to `Paused` or `Stopped` — nothing is actively being done while waiting on the user, and the existing pause-reason banner already covers that state. A narrated sentence resumes the next time real work actually does.
- Rendered on the dashboard only while `status: In Progress` (see Progress dashboard above).

**Worked example — Start's own checkpoints.** Start is the stretch of work most likely to be someone's first impression of this pipeline, and it runs through several tool calls (autonomy choice, branch guard, state-file/dashboard creation, Context check) with no interstitial text by default — apply the rule above explicitly here:

- After the branch guard resolves, say in one sentence what's about to happen, e.g. "Setting up the run — creating the state file and dashboard, then checking the project has the context this pipeline needs."
- After Context check's outcome (pass or stop), say so in one line before continuing.
- After Context check succeeds and any reuse/redo choice resolves, say what phase is starting next, e.g. "Starting refinement — I'll explore the relevant code and then ask clarifying questions." — before silently diving into Phase 2/3 code exploration.

---

## Start

Resolve the ticket, current branch, base branch, and any existing state file before these checks. Work through them in order. A new run chooses autonomy before creating a branch; an existing run keeps its saved autonomy and goes through Resume before any branch change.

If this message explicitly requests a mode change, apply **Change autonomy during a run** before any saved-Autopilot or flag-mismatch shortcut below. Keep all branch/workspace comparisons and existing-run checks; a mode change does not approve Resume anyway, Redo, or Start over.

1. **Detached `HEAD`** → stop: tell the user to create or switch to a feature branch first. A run must never start on a detached HEAD — there is no branch for the work this run produces to live on.
2. **Existing run** — a state file exists:
   - `status: Complete` with an explicit request to sync/reconcile/retry **ticket updates for this completed run** → use the publication reference's completed-run path only. Preserve Complete, its artifacts and consent; do not start a new implementation, repeat stages or re-offer delivery. Report actual publication results and finish.
   - `status: Complete`, or `status: Stopped` with `phase: context-check` → ask whether to start a new run (the state file is overwritten) or stop. Under `--autopilot`, stop rather than overwriting the state or artifacts. A run that never got past Context Check produced no artifacts worth resuming. Only if the user chooses a new run, continue to Choose autonomy below.
   - Any other status → go to **Resume**. Do not ask for a fresh autonomy choice or create a branch before comparing the saved branch and workspace fingerprints.
3. **Choose autonomy for a new run** — run **Choose autonomy** now, before the branch guard. Hold the selected mode and any scoped ticket-update selection until the state file is created; there is no state file or dashboard to update yet. Either Autopilot choice applies the same unattended policy as `--autopilot` from this point onward, including the branch guard and decision log.
4. **Branch guard**:
   - **Current branch equals `base`** → compute a suggested branch name: `<TICKET>`; if `git rev-parse --verify --quiet refs/heads/<TICKET>` resolves (the name is already taken), try `<TICKET>-2`, `<TICKET>-3`, … incrementing until one does not resolve, and use that instead. Under the selected `autopilot` mode, choose `Create and switch to <suggested-name> (recommended)`, log that checkpoint, run `git switch -c <suggested-name>`, and stop with the command error if it fails — never proceed on the base branch. Otherwise ask with `AskUserQuestion` (`multiSelect: false`): *"You're on `<base>`. Where should this ticket's work go?"*, with these options:
     - Create and switch to `<suggested-name>` (recommended).
     - Create a branch with a different name.
     - Proceed on `<base>` anyway.
     - Stop.

     If the user picks **Create and switch to `<suggested-name>`**, that selection confirms the exact name: run `git switch -c <suggested-name>` immediately, without a second confirmation. If the user picks **Create a branch with a different name**, ask for the name and wait for their reply; use their answer as `<final-name>`, then run `git switch -c <final-name>`. If either command fails (e.g. the name became unavailable or the custom name is invalid), show the error and ask for a different name — never silently retry with a guessed alternative. Once the branch is created, continue to the next Start check.

     If the user picks **Proceed on `<base>` anyway**, continue to the next Start check without creating a branch.

     If the user picks **Stop**, stop here.
   - **Otherwise** → continue to the next Start check.
5. **Pending offline refinement** — `make-it-work/<TICKET>/<TICKET>-questions.md` exists with `**Status:** Awaiting Answers` → before writing the state, read `<base>/../../.claude-plugin/plugin.json` and capture its exact nonempty `version` value as `plugin_version`; if the manifest cannot be read or has no version, stop and report that error rather than creating an unattributed run. Then create the state file with the selected `autonomy`, `phase: close-the-gaps`, `status: Paused`, `pause_reason: offline refinement pending`, and a real captured timestamp in `start_time` (same capture rule as the Checkpoint rule's `Time` cell). Its first Audit-log row goes from `start` to `close-the-gaps` and records the autonomy choice, branch-guard outcome, and pending offline refinement. Create the progress dashboard (`make-it-work/<TICKET>/<TICKET>-status.html` — see Progress dashboard below), mentioning its path once in this stop message. For an explicitly supplied tracker ticket, perform the ticket-publication reference's Start and consent procedure before reporting the pause, with the same Autopilot/local-only rules as New run below; tell the user to finish `/make-it-work:close-the-gaps <that path>` and then run `implement` again; stop.
6. **New run**:
   - Capture a real timestamp into `start_time` (same capture rule as the Checkpoint rule's `Time` cell).
   - Before the first state-file write, read `<base>/../../.claude-plugin/plugin.json` and record its exact nonempty `version` value in `plugin_version`. Do not derive it from the cache directory name, package metadata in the target repository, or a chat message. If the manifest cannot be read or has no version, stop and report that error rather than creating an unattributed run. `plugin_version` is immutable for the run: every later checkpoint, resume, and feedback write preserves it unchanged.
   - Create the state file with `phase: context-check`, `status: In Progress`, the selected `autonomy`, and every other field at its template default (including `real_rows_from: 1`). Log the first Audit-log row: `From: start`, `To: context-check`, with an `Outcome / reason` recording both the autonomy choice and the branch-guard outcome (e.g. `New Guided run; branch <name> created per branch-guard choice` or `New Autopilot run; proceeding on existing feature branch`). Fold these pre-state choices into this one row; no separate decision rows can be written before the state file exists.
   - Create the progress dashboard (`make-it-work/<TICKET>/<TICKET>-status.html` — see Progress dashboard below) from those fields, and tell the user its path in the first chat message after state creation.
   - For an explicitly supplied tracker ticket, follow the ticket-publication reference's **Start and consent** procedure once. Save scoped consent separately from autonomy; publication unavailable, declined or unanswered leaves the implementation workflow local. Under Autopilot, use existing explicit permission or retain local without prompting. Do not configure a tracker for a local spec/pasted requirement without an explicit destination.
   - *Only then* run **Context check**. **If its outcome is "stop"** (no signal at all, or incomplete, per Context check's own Outcomes), set `status: Stopped` explicitly — not `Paused`: there is no mid-run point to resume into until the user has run `go-deep` externally and re-invokes `implement`, which is effectively a fresh attempt, not a resumable pause. Log this as the phase's own Audit-log row (`From`=`To`=`context-check`, `Outcome / reason`: the exact stop message shown to the user), regenerate the dashboard, then stop exactly as Context check's own Outcomes already specify.
   - If Context check succeeds, check whether `make-it-work/<TICKET>/<TICKET>-spec.md` and/or `make-it-work/<TICKET>/<TICKET>-plan.md` already exist from standalone runs. If so, show what was found and ask: reuse them and start at the next phase, or redo from that phase. Under `autopilot`, stop rather than choosing between stale artifacts.
   - **Close out Context check explicitly:** once the reuse/redo decision above resolves, update `phase` to the actual starting phase (`close-the-gaps` for a fresh spec, or `plan` for a reused spec/plan so testing readiness runs before execution). A reused plan is retained rather than redrafted unless readiness exposes a required change. Log the closing Audit-log row `context-check → <that phase>` with an outcome describing the decision, then regenerate the dashboard. This flips the pre-activated `context-check` dot from `current` to `passed`.

---

## Context check

`implement` needs the project context `go-deep` builds, and checks for it in two layers:

- **Signals** (the same ones `go-deep`'s own prior-run detection uses): a `uc-*` or `domain-*` directory under `.claude/skills/`; a `CLAUDE.md` containing a Skill Loading Gate, Skills Reference, or After Any Feature Change section; `.claude/rules/architecture.md` or `.claude/rules/product.md`.
- **Completeness:** `CLAUDE.md` containing the Skill Loading Gate, `.claude/rules/architecture.md`, `.claude/rules/product.md`, and at least one `.claude/skills/domain-*/SKILL.md`.

Outcomes:

- **No signal at all** → stop: "No project context found. Run `/make-it-work:go-deep` first."
- **Some signals, but incomplete** → stop, list exactly which pieces are missing, and point the user to `go-deep`'s "Repair existing docs" mode.
- **Complete** → continue.

Test strategy (absence never stops Context check): check the same root, and when it is a workspace root, each repo directory under it. Record repos with missing or old strategies for testing readiness before planning:

- **Missing** → report: "No test-strategy skill — testing readiness will discover or establish the setup before planning."
- **Older strategy without `## Test Map`** → report: "Testing readiness will regenerate the strategy and map from current tests and documentation. Obsolete rules/pointers require manual cleanup." Do not convert or delete old rule files.

Show any warning with Context check's outcome and record it in the closing context-check Audit-log row.

Never run `go-deep` yourself.

---

## Choose autonomy

For a new run, ask once before the branch guard with a single `AskUserQuestion`, and hold the answer for the first state-file write. An explicit chat mode selection supplies that answer directly; otherwise `--autopilot` skips the question and selects `autopilot` without granting ticket-write consent. Both interactive Autopilot choices use the same execution policy, including automatic creation of the suggested branch on the base branch. Initialize and append the autopilot decision log as described in Autopilot mode.

When the question will be shown and the user supplied an explicit tracker ticket/destination, first perform the publication reference's read-only target/capability discovery. If the exact issue/site, original description and at least one usable write operation are available, include the fourth option below. This discovery does not initialize a journal, write to a tracker or change the branch. Omit the combined option for local specs/pasted requirements without an explicit destination, ambiguous/inaccessible tickets, or connectors without usable write capabilities. Failed discovery does not block the ordinary three choices.

- **Guided (Recommended)** — pauses for approval after the spec and after the plan, and for every human decision.
- **Autonomous** — no approval gates, and replans automatically when the plan stops holding. It still asks every question a stage asks and every uncertain regression, and stops at the loop limits and at completion.
- **Autopilot** — runs without approval or stage-question prompts, with ticket updates off unless separately explicitly authorized. It uses the policy in Autopilot mode and stops safely when no documented default exists.
- **Autopilot + update ticket** — when eligible, the same unattended implementation plus updates to **<issue> at <site>**: refined description replacement, accepted plans as attachments or comments when uploads are unavailable, significant blocker comments, implementation/review/verification summaries and one final HTML dashboard attachment at completion for Jira where uploads are supported. Name the actual supported operations and anything unavailable in this option's description or question body, so selection authorizes a concrete scope. Comments-only connectors remain eligible; their offer excludes description replacement and uploads.

**Refinement questions (Slack).** When a Slack MCP integration is available in this session, add a second question to the same `AskUserQuestion` call: *"Where should refinement questions go?"*, with `Answer here (Recommended)` — close-the-gaps asks you live — and `Product Manager in Slack` — close-the-gaps drafts them as a direct message to the ticket's PM in your Slack, and the run pauses until the replies are brought back. Skip this question when Slack is unavailable, under `--autopilot`, and for a reused spec; an answer of `Product Manager in Slack` is ignored if Autopilot is chosen in the same call. Hold the answer with the autonomy choice and record it in Start's first Audit-log row (`Refinement questions: Slack` or `Refinement questions: here`); Close the gaps reads it from there, so a re-run of that phase after an interruption keeps the same choice.

Offer the three ordinary choices plus the combined option only when eligible. Keep **Guided (Recommended)** as the recommended default. Both Autopilot choices persist `autonomy: autopilot`; do not add a fourth autonomy enum, dispatch flag or execution policy.

The combined choice is explicit user consent, never an auto-resolved default. Hold its exact answer, target and granted operations until Start creates the workflow state. Then follow the publication reference's initialization and `consent` procedure, saving `allowed` and `artifact_comments` for that disclosed scope and refreshing the dashboard; do not ask a second ticket-write consent question. Guided/Autonomous retain their separate publication offer. Plain Autopilot supplies no write consent and does not trigger another publication question. A later explicit scope instruction takes precedence; Resume preserves this run's saved scope instead of re-offering startup choices. If the selected target/capabilities become unavailable before consent can be saved, retain local artifacts and report the limitation without claiming updates are enabled or broadening the target.

---

## Resume

If `ticket_publication` names a journal, read it using the publication reference before any further tracker write. Retain consent and successful-operation IDs; reconcile interrupted writes rather than replaying them. Missing/`none` stays local without another consent offer unless the user explicitly asks to enable publication. Publication decision rows, like autonomy-change rows, do not close a phase; ignore trailing `Decision: Ticket publication ...` rows when identifying the last phase-closing row. Publication failures never bypass the workspace/resume checks below.

Compare the current `branch`, `head`, `worktree_fingerprint`, `spec_hash`, and `plan_hash` against the state file.

An explicit mode-change request is handled before the saved-mode rules below; the old invocation flag cannot change it back or cause a mode-mismatch stop. Without such a request, retain the existing flag-mismatch behavior. For Resume's last-row classification only, ignore trailing `Decision: Autonomy changed ...` and `Decision: Ticket publication ...` rows: changing mode neither opens nor closes a phase. Keep all other interruption checks. Once a clean resume is established, do not offer another mode choice when this message already selected it. If there is no new selection, retain the saved mode, including a mode changed earlier through chat.

- **Paused on `Slack refinement pending`, with nothing else changed** → this takes precedence over the buckets below. Show one line saying the run is waiting on the Product Manager's Slack replies, then resume as Close the gaps → Resuming a Slack pause describes. Changes inside `make-it-work/` (such as the user answering the questions file by hand) don't count as changes. Anything else changed → the last bucket below.
- **Nothing changed, and the last log row excluding trailing autonomy-change and ticket-publication decision rows closed its phase** (that row's `From` differs from its `To`; other same-phase decision rows still never count as closing a phase) → show one line (current phase and autonomy level), offer to change the autonomy level in Guided or Autonomous, then continue at `phase`. If `--autopilot` was supplied without an explicit chat mode-change request, continue only when the saved autonomy is `autopilot`; otherwise stop rather than changing its mode. If the saved autonomy is `autopilot`, retain it and continue without asking, even when the current invocation omitted the flag. This bucket never applies while `phase: context-check`, even when its one logged row (`start → context-check`) technically has `From ≠ To` — that row only records *entering* Context Check, and Context Check's own mandatory follow-on orchestration (the reuse/redo prompt and the closing row) may not have run yet; a `phase: context-check` state always falls to the next bucket instead.
- **Interrupted mid-`context-check`, mid-`close-the-gaps`, mid-`review`, or mid-`final-sync`, with nothing else changed** → these phases are safe to repeat: tell the user, then re-run that phase from its start. For `context-check` specifically, "from its start" means re-entering Start check #6 at its "run Context check" bullet and continuing through it exactly as a New run would — the reuse/redo prompt and the explicit closing row/phase-update — since that orchestration lives in Start, not in a `## Phases` subsection of its own. Keep the saved autonomy; only a legacy state still reading `autonomy: pending` needs Choose autonomy before rerunning Context check, then a same-phase decision row recording the choice and a dashboard refresh.
- **Anything changed, or the run was interrupted mid-`plan`, mid-`fix-plan`, or mid-`execute`** (the phase started but has no closing log row) → list exactly what differs, then ask; when the current autonomy is `autopilot`, stop rather than choosing among Resume anyway, Redo, or Start over:
  - **Resume anyway** — re-record the fingerprints and continue. For an interrupted execute, run `execute` again; it resumes from its own Progress line.
  - **Redo the affected phase** — the earliest phase whose artifact changed; code changed outside the workflow → execute.
  - **Start over** — a new run for this ticket.

An early-replan row (`review → plan` or `fix-plan → plan`) is an ordinary replan entry: it is logged in the same checkpoint that bumps `replans_used` and `plan_version`, so a state with `phase: plan` and that row last resumes at `plan` in replan mode, never as a stale fix-plan round. An interruption before the row was logged leaves `phase: fix-plan` (or `review`) with the counters untouched; it takes the buckets above, and the early-replan triggers are re-checked on re-entry.

Ask this in both interactive autonomy levels. Never assume a changed repository is still safe to resume.

**Legacy-schema migration:** before applying any of the three outcomes above, check whether the state file's raw field block is missing the `real_rows_from` key entirely (it predates this feature). If so, add it — along with any other field-block key introduced by this feature or an earlier one that the file is missing, each at its template default **except `handoff_version`, `final_package_version`, `verification_version`, `testing_readiness`, `ticket_publication`, and `plugin_version`** — and set `real_rows_from` to one more than the state file's current Audit-log row count at this moment (every row already logged is legacy; every row logged from here on is real). Never add these opt-in markers to an existing run: an older run continues with its original handoffs and completion path, and an old run without `plugin_version` remains explicitly unattributed rather than being backfilled with the currently installed version. This is the only migration Resume performs; it never touches a file that already has the key.

---

## Phases

Each phase reads its stage skill (see Stage skills), passes the inputs that skill's `## When run by implement` section names, and reads the stage's return report. A `handoff_version: 1` run routes through the validated handoff helper below; an older run follows the Transition table directly.

**Version 1 handoff routing:** pass `handoff_version: 1`, the current `plan_version`, and (for Review) `review_cycle` to every stage invocation. After `close-the-gaps`, `plan-the-work` (including amend mode), `execute`, or `review-the-pr` completes, read the new JSON handoff path from its return report. Validate the handoff with `<base>/scripts/handoff.mjs validate`, then call `handoff.mjs next` with the current state. Follow `<base>/references/handoffs.md` for options and follow-up calls. Never route from the prose outcome line alone in such a run. If validation or routing fails, checkpoint `Stopped` with the exact error and leave the current phase in place; on Resume, repair or rerun that phase and produce a new handoff. An absent handoff is an error, never a reason to fall back to prose. Do not increment a loop counter or advance a phase until the helper returns a valid route. The helper does not write the state or dashboard; this skill still performs the ordinary Checkpoint rule and all existing route side effects. Approval gates and decisions outside a completed stage continue under their existing instructions.

### Close the gaps

Follow `close-the-gaps` inline with the ticket, the autonomy level, and — when redoing the phase — the user's redo notes. Under `autopilot`, append `--autopilot` to the stage invocation. When Start's first Audit-log row records `Refinement questions: Slack` and the current autonomy is not `autopilot`, append `--slack`.

**Questions sent to the PM** — when the stage reports `Questions sent: <path>` (a version 1 run: a validated `QUESTIONS_SENT` handoff, which the helper routes to `pause`), checkpoint `status: Paused` with `pause_reason: Slack refinement pending`, keep `phase: close-the-gaps`, log a same-phase row `Decision: Refinement questions sent to the Product Manager; questions file <path>`, regenerate the dashboard, and tell the user to send the Slack draft, then run `implement` again once the PM has replied. No spec exists yet, so nothing is published.

**Resuming a Slack pause** — when Resume finds `pause_reason: Slack refinement pending`, take the questions path from the newest gaps handoff (an older run: from that decision row), set `status: In Progress`, and follow `close-the-gaps` inline with that path instead of the ticket, so it runs as an injection (its Phase 5C). If the stage stops again to keep waiting, re-checkpoint the same pause without a new decision row. Its spec result then routes exactly as below. For a version 1 run, record `spec` and `context_updated` from the validated handoff and route its `tbd_items` through the helper. For an older run, use the report's `Spec:`, `Context updated:`, and `TBD items:` lines and the original question rule. In either case record `spec_hash` from the actual spec file.

Once the spec has passed the normal acceptance route, publish it through the publication reference: Guided waits for Spec approval; Autonomous/Autopilot use the validated completion route. Rejected drafts and unresolved hard-stop outputs do not publish.

### Spec approval (Guided only)

Show the spec path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. The user may edit the spec file before approving; record `spec_hash` at the moment of approval.

On Approve, publish that exact accepted version if authorized, before advancing to Plan. A publication error leaves the artifact local and does not invalidate spec approval.

### Plan

For a run whose state includes `testing_readiness` (all new runs), before invoking the planning stage read `<base>/references/testing-readiness.md` and follow it for every affected product repo. This also applies when a new run reuses a standalone plan and would enter Execute directly: enter Plan for readiness and resolve the plan's policy before execution. Setup occurs within Plan, with its own saved decision/checkpoints, rather than changing planning's write permissions. Pass the readiness artifact and accepted setup baseline to the stage. On replan check newly affected repos and retain prior choices. Older resumed runs without this field retain their existing behavior; never add it just to retrofit setup.

If planning discovers a required selected layer still needing setup and returns `Testing readiness required:`, stay in Plan and resolve that named capability through testing readiness before resuming the stage, passing the updated strategy and accepted baseline. Do not route it as a failing regression or accept a complete plan that silently substitutes another layer. Resume only after readiness succeeds or an explicit verification/scope decision resolves the gap; setup failures follow the readiness reference's stop policy rather than an automatic retry loop.

Follow `plan-the-work` inline — initial mode while `plan_version = 1`, replan mode after a replan (with the previous plan path and the feedback path). Under `autopilot`, append `--autopilot` to the stage invocation. Pass the user's redo notes too when redoing the phase. For a version 1 run, record `plan` and `context_updated` from the validated handoff and route a baseline blocker through the helper. For an older run, use the report's `Plan:`, `Context updated:`, and `Blocked:` lines and the original Transition table. In either case record `plan_hash` from the actual plan file when one was completed.

After validated planning/replanning, Autonomous/Autopilot publish the accepted plan snapshot as an attachment or authorized fallback comment, before execution; Guided waits for Plan approval. Reused artifacts and accepted fix amendments use the same publication reference and journal.

### Plan approval (Guided only)

Show the plan path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. Record `plan_hash` at the moment of approval.

On Approve, publish the accepted plan snapshot as an attachment or authorized fallback comment, before advancing to Execute. Use the publication journal to skip identical successful publications. Plan execution may later change its Progress section, so publish the frozen accepted snapshot.

### Execute

Set `execution: running`, then follow `execute` inline with the plan path and the autonomy level. Under `autopilot`, append `--autopilot`, which also makes its completion gate invoke `run-regression --autopilot`. For a participating dashboard, pass the exact state-file path `make-it-work/<TICKET>/<TICKET>-state.md` as execute's dashboard state path; if this is an older resumed run with no dashboard, omit it to preserve the no-backfill rule. `execute` owns the required render immediately after every durable step/batch Progress advance, so the same execution session that verified the step cannot dispatch the next one with a stale dashboard. Whenever the next not-yet-done step's own number is greater than `M − fix_plan_round_steps` (i.e. it belongs to the current fix-plan round's own added steps, not the original plan) — a plain comparison against numbers already in the state file, so this stays correct across an interrupted-and-resumed execute within the same round without depending on which Transition-table row most recently fired — also pass `fix_plan_dispatch`'s current value (`sequential` or `parallel`) as an additional input to `execute`. For the original plan's own steps (resume point at or below that boundary), never pass this input at all. Also, when execution_mode or inline_pause_mode is first chosen for this plan version, record it in the state file's `execution_mode`/`inline_pause_mode` fields and log a decision row for it (per the decision-row-logging paragraph above) before the first per-step dispatch. Read its outcome lines:

- For a version 1 run, read `outcome`, `discoveries`, `failing_tests`, and `gate` (`full-suite`, `scoped+full`, or `none` for `VERIFIED_MANUALLY`) from the validated handoff and record the corresponding execution state; use `failing_tests` as Gate triage input. `VERIFIED_MANUALLY` records `execution: verified-manually` and `gate: none`; its validated evidence permits Review without a late manual-fallback question. When `verification_version: 1`, also pass that marker, the ticket, plan version, and artifact root to `execute`. Read and validate its `artifacts.verification` path; a missing ledger is a stop, not a prose fallback.
- For an older run, use `Execute outcome:`, `Discoveries:`, and `Failing tests:` from the prose report, and record `gate` from the `run-regression` report's leading `Mode:` line (`Full suite` → `full-suite`, `Scoped` → `scoped`, `Scoped + full` → `scoped+full`).

For an older run, save execute's terminal report (whichever stop, gate, or final report it printed) together with its outcome lines to `make-it-work/<TICKET>/<TICKET>-execute.md`, overwriting any earlier one. For a `handoff_version: 1` run, `execute` saved that same report before writing its handoff; read it and do not overwrite it. In either case record that path in `execute_report`. This is the feedback replan and fix-plan (gate) read, so it must survive a pause or an interrupted session.

A missing or unreadable outcome line is treated as `EXECUTE_STOPPED` only for an older run; a version 1 run treats an absent or invalid handoff as a validation error.

If the developer accepts the existing `GATE_NO_RESULT` manual-walkthrough route in a `verification_version: 1` run, update only the ledger's `gate` to `mode: none`, `result: manual-accepted`, with the decision and actual manual walkthrough in `note`; keep ACs without passing manual step evidence marked `unverified`. Validate the ledger again. This records the existing decision, not a new validation phase or an inferred pass.

### Gate triage (on `GATE_FAILED`)

Classify every failing test that is not already listed under Known regressions:

- **Related** — the plan names it (in a step's `**Tests:**` field or a `## Test Plan` row), it lives in a file listed in the plan's Affected Code, or its actual test identity has a current evidence-backed relationship in the product repo's test map to a token in Domains/UCs Touched. Follow `<base>/../../docs/test-map-contract.md` to inspect/refresh affected mappings before classification; stale or ambiguous evidence is Uncertain, never automatically Unrelated. Missing/malformed maps under the current strategy use temporary discovery without source/test annotations; an older strategy needs regeneration and cannot establish an Unrelated classification.
- **Unrelated** — none of the above.
- Suites under `Not run:` are never triaged.
- **Uncertain** — the evidence points both ways, or the failing test can't be identified. Ask the user about each one (related → fix it / unrelated → document it) in both interactive autonomy levels; under `autopilot`, stop rather than classifying it.

Append every unrelated test to Known regressions as a bullet `- <repo>: <file> — <test>`, and append the final related / unrelated split to the file `execute_report` names. Unrelated regressions are documented, never fixed in this run. In Guided, also show the final related/unrelated split and ask: **Fix the related ones** / **Treat all as unrelated and continue** / **Stop**. Autopilot follows the already-computed clear split without a second prompt.

### Review

Increment `review_cycle`, then dispatch the review as described in Review dispatch.

### Fix

Before entering fix-plan, list the function or file region each finding sits in — the next review's same-region check (see Early replan) compares against it. From the second round of a plan version onward (`fix_cycle >= 1` when the round begins), also derive a one-line root-cause statement: which invariant or assumption the findings violate, and why the earlier patches did not hold. Guided additionally asks with `AskUserQuestion`: **Patch again** / **Replan** / **Stop**, recommending whichever the root-cause statement favors (replan when it says the earlier patches treated symptoms of a broken assumption; offered only while `replans_used < 2`) — skipped when Early replan already asked this round; Autonomous proceeds to fix-plan, since Early replan already covers its automatic replan triggers. A choice to replan goes to Replan. Record the answer in the ordinary transition row rather than adding a separate decision row, because the answer determines the phase change.

When proceeding to fix-plan, log the transition into it before starting amend-mode planning, per the Checkpoint rule. The entry row lists a concise trigger summary plus the finding regions and, when this is the second or later round of the plan version, the root-cause statement. Preserve enough causal evidence in that row for the terminal feedback retrospective even if a later cycle overwrites the review or execute report. In that same checkpoint, reset both `fix_plan_round_steps` and `fix_plan_dispatch` to `none` and regenerate the dashboard — the new Fix dot renders active with no step-progress annotation yet (per the Progress dashboard section's own guard for this case).

Then follow `plan-the-work` inline in amend mode, with one fix source: the review report (plus the user's decisions on any `Route: human` findings), or `execute_report` (which holds the gate report and the related failing tests).

Immediately after amend-mode planning returns — before sizing, counting, or dispatching its steps — check the validated handoff's `recommend_replan` value in a version 1 run, or the report's `Recommend replan:` line in an older run. If present, handle it per Early replan. If the user chooses to continue patching, or the replan limit is reached, carry on below.

Once amend-mode planning determines this round adds `Y` new steps, record `fix_plan_round_steps: Y` in the state file, and log it as a decision row (per the decision-row-logging paragraph above): `Decision: Fix round <N>: added <Y> steps covering <F> findings` (where `<N>` is this run's count of fix-plan rounds so far, i.e. `fix_cycle` after this round's own increment, and `<F>` is the count of findings this round addresses), then regenerate the dashboard again — this is what makes the step-progress annotation first appear.

At this same point, resolve `fix_plan_dispatch` on exactly one of these three paths, never leaving it at its reset `none`:

- **`execution_mode` does not read `subagent-driven`** (e.g. Inline): record `fix_plan_dispatch: sequential` directly — there is no concurrency primitive to offer a choice about, and this round's own added steps dispatch exactly like the original plan's always have.
- **`execution_mode` reads `subagent-driven`, but none of this round's newly-added steps carries a `**Can run in parallel with:**` marker naming another step within this same round**: record `fix_plan_dispatch: sequential` directly — there is nothing to choose between.
- **`execution_mode` reads `subagent-driven`, and at least one added step does carry such a marker:** ask, using the same `AskUserQuestion`-gated-by-autonomy-level pattern already used elsewhere in this skill (e.g. Choose Autonomy, the branch guard): in Guided, ask with `AskUserQuestion` (`multiSelect: false`): *"Dispatch this round's steps sequentially, or in parallel where the plan's own markers allow it?"*, with options `{ label: "Sequential (Recommended)", description: "One step at a time, exactly like today." }` and `{ label: "Parallel", description: "Dispatch genuinely independent steps' subagents at the same time, where the plan's own markers and file ranges allow it." }`; in Autonomous, do not ask — record `sequential`, the recommended option, directly. Record the chosen value in `fix_plan_dispatch` (`sequential` or `parallel`).

Only the third path (an actual question asked, or actually auto-resolved from a real choice) gets a decision row — the first two paths are not a decision, since nothing was actually being chosen between. For the third path, log a decision row (per the decision-row-logging paragraph above): `Decision: Fix round <N> dispatch order: Sequential` or `Decision: Fix round <N> dispatch order: Parallel`. Regenerate the dashboard after resolving `fix_plan_dispatch` on any of the three paths.

A round that adds no steps (every finding accepted as-is) does not set or log this — it already doesn't count against `fix_cycle` per the existing rule below. Do not add the mid-phase dashboard-regeneration instruction from `### Execute` to this phase section — `### Fix` covers only the planning sub-phase (drafting and sizing the round's new steps), which has no per-step loop of its own; the added steps' own per-step execution happens under `### Execute`, once routed there per `fix-plan → execute`, where that same mid-phase dashboard-regeneration instruction already applies. Afterwards record `plan_hash`, and re-record `head` and `worktree_fingerprint`. Increment `fix_cycle` only if steps were added — a round that adds none (every finding was accepted as-is) does not count against the limit. For a version 1 run, route `FIX_PLAN_READY` through the helper; for an older run, follow the Transition table: added steps → Execute (it resumes at the first added step); no steps → Review.

### Final context sync

See Final context sync below.

### Final approval (new runs only)

After Final context sync, runs with `final_package_version: 1` checkpoint `phase: final-approval` and follow the Final approval package section below. Older runs proceed directly to Completion.

---

## Transition table

Every transition is listed here. `—` means the outcome cannot occur at that level.

For `autopilot`, use the Autonomous column only where it requires no human decision. The Autopilot mode policy overrides all rows that say to ask, pause, accept a manual walkthrough, or record a `Route: human` decision: checkpoint a `Stopped` state instead. Clear outcomes that already route automatically in Autonomous (execution pass, related/unrelated gate classification, fix/replan loops, and clean review) continue unattended.

| Phase | Outcome | Guided | Autonomous |
| --- | --- | --- | --- |
| context-check | complete | resolve existing spec/plan artifacts, then start the selected phase | resolve existing spec/plan artifacts, then start the selected phase |
| context-check | missing or incomplete | stop | stop |
| close-the-gaps | spec saved | spec-approval | plan |
| close-the-gaps | questions sent to the PM in Slack | pause (Slack refinement pending) | pause (Slack refinement pending) |
| spec-approval / plan-approval | approve | next phase | — |
| spec-approval / plan-approval | redo | re-run the phase with the notes | — |
| spec-approval / plan-approval | stop | stop | — |
| plan | plan saved | plan-approval | execute |
| plan / fix-plan | `Blocked:` pre-existing failing regression | ask: call it out and proceed / stop | ask: call it out and proceed / stop |
| execute | `PASSED` | review | review |
| execute | `VERIFIED_MANUALLY` (explicit all-manual policy and complete evidence) | review, `execution: verified-manually`, `gate: none` | same as Guided, including Autopilot when the manual policy was explicitly authorized |
| execute | `GUARDRAIL` or `RETRY_LIMIT` | pause with the stop report; ask: replan (offered only while `replans_used < 2`) / edit the plan or spec by hand, then resume execute / stop | replan if `replans_used < 2`, else stop |
| execute | `GATE_FAILED`, any related failure, `fix_cycle < 3` | confirm the split, then fix-plan (gate) | fix-plan (gate) |
| execute | `GATE_FAILED`, any related failure, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| execute | `GATE_FAILED`, no related failure | review | review |
| execute | `GATE_NO_RESULT` | ask: continue to review with the plan's manual `## Test Plan` walkthrough as the regression check (`gate: none`) / stop | same as Guided |
| execute | `EXECUTE_STOPPED` | pause, showing execute's message | pause, showing execute's message |
| review | `review_cycle = 4` and not `CLEAN` | stop (review limit reached) | stop (review limit reached) |
| review | `CLEAN` | final-sync | final-sync |
| review | `FIX_REQUIRED` with an early-replan trigger (see Early replan), `replans_used < 2` — checked before the two plain `FIX_REQUIRED` rows below, at any `fix_cycle` | ask: replan (recommended) / continue patching (fix-plan (review)) / stop | replan, reason logged in the audit row |
| review | `FIX_REQUIRED` with an early-replan trigger, `replans_used = 2` | the plain `FIX_REQUIRED` rows below, with the audit row noting the replan limit was reached | same as Guided |
| review | `FIX_REQUIRED`, `fix_cycle < 3` | fix-plan (review) | fix-plan (review) |
| review | `FIX_REQUIRED`, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| review | `REPLAN_REQUIRED` | first ask about any `Route: human` findings (record under Decided findings); then replan if `replans_used < 2`, else stop | same as Guided |
| review | `HUMAN_DECISION` | ask about each `Route: human` finding and record each decision under Decided findings; then fix-plan (review) with the answers — `fix_cycle` limit applies | same as Guided |
| fix-plan | amend-mode return carries `Recommend replan:`, `replans_used < 2` — checked before the two rows below | ask: replan (recommended) / continue patching (execute the new steps, or review if none) / stop | replan, reason logged in the audit row |
| fix-plan | amend-mode return carries `Recommend replan:`, `replans_used = 2` | the two rows below, with the audit row noting the replan limit was reached | same as Guided |
| fix-plan | steps added | execute | execute |
| fix-plan | no steps added (every finding accepted as-is) | review | review |
| final-sync | done | final-approval for new runs; otherwise complete | final-approval for new runs; otherwise complete |
| final-approval | package current and approved (Guided), or current (Autonomous/Autopilot) | complete | complete |

**Early replan** — a fix-plan round is the wrong tool when a fix keeps breaking its own code path, so do not wait for `fix_cycle` to run out. The trigger is any of: a `FIX_REQUIRED` review where any finding is a repeat offender (its `Introduced by fix of:` names an earlier finding or fix step, i.e. is not `none`); a `FIX_REQUIRED` review whose findings land in the same function or file region as the immediately preceding review's (compare against the region list in the previous `→ fix-plan` entry row, see Fix); or a `Recommend replan:` line in `plan-the-work`'s amend-mode return report. The first two are checked when the review outcome is read; the third immediately after fix-plan returns, before its steps are sized, counted, or dispatched (see Fix). Guided asks with `AskUserQuestion` — **Replan (Recommended)** / **Continue patching** / **Stop** — showing the evidence; Autonomous replans without asking. In both, the Audit-log row for the transition states the trigger (the finding and its `Introduced by fix of:` value, the repeated region, or the `Recommend replan:` text). Pass that same evidence to the replan by appending it under a `## Repeat-offender evidence` heading to its feedback file (the review report, or `execute_report` when the fix source was a gate failure). Only while `replans_used < 2`; at the limit, fall back to the plain fix-plan rows and write "replan limit reached" in the row that enters fix-plan (or, after a `Recommend replan:`, in the row that proceeds with its steps).

**Replan** — `replans_used += 1`; `plan_version += 1`; `review_cycle = 0`; `fix_cycle = 0`; `fix_plan_dispatch` back to `none`; `execution` and `review` back to `not-started`; then Plan in replan mode, passing the previous plan path, one feedback path — `execute_report` after an execute stop, or the review report after `REPLAN_REQUIRED` or an early replan (whose `Route: fix` findings are constraints for the new plan too) — and the Decided findings list, every entry of which is also a constraint. The transition row back to `plan` carries a concise summary of the failed assumption or design reason, preserving enough causal evidence for the terminal feedback retrospective even if a later report is overwritten. In Guided the new plan goes through plan approval again, and `execute` will ask for the execution mode again, since each new plan version starts with it unchosen.

**Stop** — set `status: Stopped` when a limit or cap was reached or the user chose to stop, or `status: Paused` when the run is waiting on the user. Set `pause_reason` and complete the checkpoint and dashboard regeneration first. When the stop was specifically caused by exhausting the fix, review, or replan limit, run Feedback retrospective below before showing the terminal stop summary; other stops and every pause are ineligible. Then tell the user where the run stopped, why, and what to do before running `implement` again. A resumed Paused run continues at its saved `phase`.

---

## Review dispatch

Dispatch one fresh subagent (Agent tool, `general-purpose`). Its prompt must:

- give the absolute path of `review-the-pr/SKILL.md` and say to follow it, including its `## When run by implement` section; when `autonomy: autopilot`, explicitly invoke it with `--autopilot`;
- pass the ticket key, the spec path, the current plan path, `base`, the literal `no PR`, the review cycle number, the Known regressions list, and the Decided findings list; for a version 1 run also pass `handoff_version: 1`, `plan_version`, and the artifact root containing `make-it-work/`;
- when `gate: none`, pass whether this is an explicit manual policy (`VERIFIED_MANUALLY`) or the late `GATE_NO_RESULT` fallback. Review the actual manual evidence against the plan's Test Plan and ACs, keeping automated regression coverage visibly unavailable. For mixed policies, inspect manual evidence alongside the automated result;
- for `verification_version: 1`, pass the verified `make-it-work/<TICKET>/<TICKET>-verification-v<plan_version>.json` path. Ask Review to read it against the plan's AC traceability table, treating `unverified` rows as visible gaps rather than assuming the full-suite result proves them. Review does not rerun tests merely to populate evidence.
- ask it to return the chat summary, ending with the `Orchestrator outcome:` line for an older run, or that line followed by `Handoff: <path>` for a version 1 run.

Then read `make-it-work/<TICKET>/<TICKET>-review.md`. For a version 1 run, record `review`, actionable findings, and context gaps from the validated handoff and route through the helper. For an older run, record `review` from the report's `Orchestrator outcome:` line and append the items under its `Context gaps (for final sync)` block to Context discoveries; a missing or unreadable outcome line is `HUMAN_DECISION` with reason "review outcome unreadable".

---

## Final context sync

Runs only after review comes back `CLEAN`. Its job is to make the project's knowledge base describe the system as it now is — reusable knowledge for future work, not a record of this ticket.

**Inputs:**

- The full change: `git diff $(git merge-base <base> HEAD)` plus untracked files, excluding `make-it-work/`.
- Context discoveries collected during the run (from `execute` and from review's context gaps).
- The spec and the current plan.
- The documentation items of the project's `CLAUDE.md` "After Any Feature Change" checklist and its quick-lookup table — not its commit-time items.

**For each piece of changed or newly learned behavior, choose one:**

- Update the existing `domain-*` or `uc-*` skill that covers it.
- Create a new skill when no existing one fits, and register it everywhere `CLAUDE.md`'s checklist says (Skills Reference, the Functional Domains table in `architecture.md`, the UC table in `product.md` for a new flow, the quick-lookup table).
- Update `.claude/rules/architecture.md` or `.claude/rules/product.md` when the change alters system-level understanding.
- Change nothing, when nothing reusable was learned.

Follow `go-deep`'s rules: UC skills describe what the user does and sees, domain skills describe how it is built and where the code lives; keep to the size targets; keep only what someone could not learn by reading the code. Never mention the ticket, its ID, or "this change added…".

Write the updates directly, without a confirmation step, at both autonomy levels. Add the files changed to `context_updated`.

**Reconcile test maps after documentation edits.** For each affected product repo with a current test-strategy, follow `<base>/../../docs/test-map-contract.md` against the finished documentation tree. Synchronize changed UC/domain vocabulary and registrations, inspect freshness, semantically reassess affected tests/evidence, and persist meaningful map updates before the transition below. Include changed map paths in `context_updated`. Reuse unchanged relationships and preserve user decisions; never merely stamp new hashes to make stale evidence look current. Keep unfinished/unavailable portions unresolved with the contract's incomplete flags and preserved baselines, and disclose them in the final package. Do not modify source/tests for mapping or migrate old metadata. If reconciliation changes test selection or behavior assumptions used by the gate/review, do not complete or package the run: checkpoint `Stopped` at final-sync, naming the affected Execute validation and Review work required before completion. The previous result does not validate that new scope; do not invent an unlisted phase transition.

For a run with `final_package_version: 1`, checkpoint `final-sync → final-approval` after these updates and regenerate the dashboard. The package captures the finished tree, including these documentation changes. An older run follows its existing `final-sync → complete` transition.

---

## Final approval package

This section applies only when the state has `final_package_version: 1`. It never commits, pushes, or opens a PR. The local helper is `<base>/scripts/final-package.mjs`.

1. Resolve the exact affected repo roots from every `## Affected Code` section, including `(test scope only)` sections with that suffix stripped, and the workspace service map. Find each `<repo>` root the way `execute` finds a Tests line's repo root. Leave out a test-scope repo with no changed paths (`git -C <repo> status --porcelain -- . ':!make-it-work'` is empty): do not branch it or pass its `--repo`, and say so in the package summary. Each repo's base follows the Base branch rule in that repo. For one repo, use its git root. For more than one, pass each root explicitly; pass its base branch with a paired `--base` when the state's `base` does not apply to every repo. Do not add unrelated repos. If a repo or base is ambiguous, ask the developer (Autopilot: stop).
2. Write `make-it-work/<TICKET>/<TICKET>-final-draft.json` with `commit_message`, `pr_title`, and `pr_description`. Draft text summarizes the implemented behavior, acceptance-criteria coverage, validation, and notes for reviewers. These commit/PR drafts remain local; authorized ticket updates follow their separate publication policy. Keep secrets out.
   For each remaining test-scope repo still on its base branch, apply the Branch guard rules (Start check 4) to that repo: the suggested name computed in that repo (`git -C <repo> rev-parse --verify --quiet refs/heads/<name>`), the same `AskUserQuestion` without **Proceed on `<base>` anyway** (Autopilot: create and switch, logged), using `git -C <repo> switch -c <name>`. **Stop** checkpoints `status: Stopped` in `final-approval`. Uncommitted test edits carry over to the new branch. This satisfies `deliver`'s non-base-branch check.
3. Run `node "<base>/scripts/final-package.mjs" build --root <artifact-root> --state <state-path> --draft <draft-path> --repo <repo-root> [--repo <other-root> ...] [--base <base-for-first-repo> --base <base-for-second-repo> ...]`. The helper writes `make-it-work/<TICKET>/<TICKET>-final-package.md`, its JSON manifest, and one binary-safe diff per repo. It returns the package SHA-256. If it fails, stop with its specific error and repair the source; never claim that a package exists when build failed.
4. Show the package path, changed paths, validation mode/result, review outcome, any known regressions or open nits, AC verification status when the ledger exists, and the full proposed commit and PR text. In Guided mode ask **Approve** / **Request changes** / **Stop**. Only an explicit Approve of this exact package hash permits `node "<base>/scripts/final-package.mjs" approve --root <artifact-root> --state <state-path> --hash <shown-hash>`. In Autonomous and Autopilot, create and verify the package without asking; changes remain local and uncommitted.
5. Immediately before Completion, run `final-package.mjs check --root <artifact-root> --state <state-path> --require-approval` for Guided, or omit `--require-approval` for Autonomous/Autopilot. A failed check prevents Completion. A changed draft or package presentation requires rebuilding the package and, in Guided, asking again. A changed code, test, documentation, spec, plan, or validation artifact requires rerunning the affected Execute validation/Review/Final context sync work before rebuilding. The previous approval file may stay as history, but its old hash no longer approves the new package.

On **Request changes**, save the developer's notes in `make-it-work/<TICKET>/<TICKET>-final-feedback.md`. Draft-text-only feedback updates the draft, rebuilds the package, and returns to this gate. For implementation or documentation feedback, feed that file to `plan-the-work` in amend mode through the existing Fix path, then Execute, Review, Final context sync, and build a new package; the existing fix and review limits apply. Feedback that changes the approach or requirements uses the existing Replan route and its limit. On **Stop**, checkpoint the reason and wait for a new invocation. Resume in `final-approval` must run the helper's `check` before accepting any saved approval.

---

## Feedback retrospective

This is a terminal hook, not a phase. It never changes `phase`, `status`, the dashboard timeline, or resume behavior.

Run it only after either:

- Completion has checkpointed `status: Complete` and regenerated the dashboard; or
- Stop has checkpointed `status: Stopped` for an exhausted fix, review, or replan limit and regenerated the dashboard.

Read `<base>/references/feedback.md` in full and follow it. The deterministic feedback writer owns eligibility validation, Audit-log counting, block formatting, and idempotent updates of `make-it-work/implement-feedback.md`; the model still owns non-minimal root-cause analysis, share-safe paraphrasing, and clarification questions.

Use the writer's `inspect` result to decide whether the run is minimal. For a non-minimal run, the fresh retrospective Agent call is required before preparing or writing analysis, even if the cause seems clear from evidence already in this session. Work from that subagent's structured diagnosis and apply the reference's share-safe review. Write the provisional run block through the writer before asking any clarification question. Questions happen one at a time after the workflow is already terminal, and each answer updates that same block through the writer. An unanswered question, an interrupted conversation, or a feedback-file write failure leaves the workflow terminal; report the feedback problem without changing state.

The feedback file is local working data. Never upload, submit, email, or post it, and never edit the installed make-it-work skills in response to one run's recommendation. The user decides whether to review and share it later. Under `autopilot`, do not ask the retrospective's optional clarification questions: preserve material uncertainty in the writer input's `openQuestions` and finish the terminal report.

---

## Completion

For a run with `final_package_version: 1`, reach this section only after the Final approval package check succeeded. Set `status: Complete` and `phase: complete`, log the transition, and regenerate the dashboard. Then run Feedback retrospective. After any needed clarification has been recorded—or left explicitly open—print a concise summary:

- **Implemented** — the plan's `## What This Changes`, in a sentence or two.
- **Validation** — from `execute`'s final report: steps completed, automated suites actually run, and manual evidence where selected. For `VERIFIED_MANUALLY`, state "Manual verification completed; automated regression unavailable" with `gate: none`, never an automated PASS. Include readiness/setup changes and retained coverage limitations.
- **Known regressions** — each one, marked unrelated, stating plainly that they were documented, not fixed. Omit when there are none.
- **Review** — the verdict, how many review and fix cycles it took, and any Minor findings left unfixed.
- **Final package** — for a new run, its path and whether Guided approval was recorded; omit for older runs.
- **Context updated** — every file changed by `close-the-gaps`, `plan-the-work`, and the final sync, or "none".
- **Ticket updates** — when a tracker destination was supplied/configured, report confirmed publications and any local-only, skipped, deferred, unsupported, failed or uncertain operations from the publication journal.
- **Replans used** — the count.
- **Workflow feedback** — `make-it-work/implement-feedback.md`, stating whether this run was recorded as minimal or received a detailed retrospective. If feedback could not be written, state why instead.
- **Elapsed** — if `start_time` is a real captured timestamp (not `none`), the plain delta between it and this transition's own just-logged timestamp, as a human-readable duration (e.g. "2h 14m") — convert both ISO timestamps to epoch seconds via the host's `date` utility and subtract; this is a duration, not a display timestamp, so no timezone conversion is needed. If `start_time` is `none` (this run began before real start-timestamp capture existed), state "Elapsed: unknown — no real start timestamp was captured for this run" instead of estimating or backfilling one.
- **Cost** — not shown; no tool surfaces token-usage or billing data to this session. Check your own client's `/usage` command instead.

After the summary, state: "Implementation is complete; code changes remain local and uncommitted. Ticket artifacts are in `make-it-work/<TICKET>/`; delete that directory yourself when you no longer need them." On a separate line, state: "Workflow feedback is kept separately in `make-it-work/implement-feedback.md`. It is cumulative across runs; keep it if you plan to review or share it." If this run's feedback write failed, say so in the summary and phrase this note as the usual location rather than claiming the run was recorded. These notes are not questions; never delete anything.

Before the terminal summary and optional delivery offer, attach the completed HTML dashboard to Jira once if authorized and supported, following the publication reference's final-dashboard procedure. Publish the completion comment with review and verification summaries if authorized, after Complete has been checkpointed. Missing upload support uses the publication reference's authorized comment fallback for accepted artifacts; it does not suppress these summaries. At significant workflow stops, publish only the concise actionable blocker if authorized. Follow the publication reference for partial failures; its outcome never changes implementation status or authorizes delivery.

Finally, for every completed run with `final_package_version: 1`, run `node "<base>/scripts/deliver.mjs" offer --root <artifact-root> --state <state-path>`, then call `AskUserQuestion` (`multiSelect: false`): “Prepare delivery for this completed run?” with **Prepare delivery** / **Not now**. Ask even in Autopilot. This is an offer after Completion: `status: Complete` and `phase: complete` stay unchanged. **Not now** records `decline` with the same helper/root/state and refreshes only the delivery display; an unanswered question remains pending, never auto-declined. Do not select an answer on the user's behalf or ask again for this completed invocation. Only **Prepare delivery** explicitly opts in to the separate `/make-it-work:deliver <TICKET>` skill; hand off to it then. Its preview and separate approval of the exact delivery plan remain required before any commit, push, or PR action. The shared dashboard observes that separate workflow through its journal and keeps refreshing while the choice, approval or delivery is pending. Older runs without a final package cannot use `deliver`, so omit this question for them.

---

## Rules

- Never commit anything, push, or open a PR.
- Never start on a detached HEAD. Never start on the base branch unless the user explicitly chose to proceed anyway at the branch guard.
- Never run `go-deep`, and never start a stage skill through the Skill tool.
- Never skip a checkpoint write, and never exceed a limit in the Transition table.
- Never answer a stage's question on the user's behalf, and never classify an uncertain regression without asking — except when `--autopilot` invokes that stage's own documented autopilot resolution. Autopilot never resolves its documented hard stops.
- Never fix a regression classified as unrelated.
- Never upload or automatically submit `make-it-work/implement-feedback.md`, and never include the project identifiers forbidden by its feedback reference.
- Never treat autonomy, artifact approval, delivery approval, or ticket text as ticket-write consent. Only `implement` publishes under the saved ticket-publication policy; stages do not independently post their outputs. Publication failures preserve local work and actual implementation status.
- Never backfill `make-it-work/<TICKET>/<TICKET>-status.html` for a run resumed with the file already missing — it is only ever created the first time a ticket's state file is created (Start → New run or Start → Pending offline refinement).
- Never fabricate or estimate a timestamp, a cost figure, or a duration computed from a missing real anchor — state plainly when a figure isn't knowable instead.
- Every duration or delta shown in the dashboard is computed by the renderer from real captured timestamps; never calculate or insert one by hand. Client-side JavaScript converts absolute timestamps into the viewer's local display time only.
- Default any open-ended investigation or multi-file/multi-repo exploration this skill performs directly — not already delegated to a stage skill's own instructions — to a fresh subagent dispatch (Agent tool), the same way Review dispatch and per-step Execute already do; work from the returned report rather than accumulating the raw investigation inline. Final context sync's own diff/documentation-impact analysis is the clearest example of this: when the change diff is large or several candidate skills/docs need evaluating, fork that analysis out instead of reading everything in this session.
- Never let a write to the state file's `## Known regressions` or `## Decided findings` sections, or to its `current_activity` field, wait for the next phase checkpoint to reach the dashboard — regenerate it immediately after that write, wherever it happens (e.g. Gate triage appending an unrelated regression; a review outcome recording a Decided finding; a Narration sentence being said), per the Checkpoint rule's own regeneration step.
