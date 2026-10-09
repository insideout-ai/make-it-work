---
name: implement
description: "Orchestrates the make-it-work pipeline for one ticket — context check → close-the-gaps → plan-the-work → execute → review-the-pr → final context sync — with saved, resumable workflow state, Guided, Autonomous, and unattended --autopilot modes, capped fix/replan loops, and local end-of-run workflow feedback. Never commits implementation changes, pushes, opens a PR, or uploads feedback. Use when taking a ticket from request to a reviewed, context-synced implementation in one run."
disable-model-invocation: true
---

# Implement

**Role:** Act as a thin orchestrator for the make-it-work pipeline.

**Goal:** Take one ticket from request to a reviewed, context-synced implementation by running the existing stage skills in order. `implement` decides which phase runs next, runs that stage skill, interprets the outcome it reports, records the transition, enforces the loop limits, and performs the final context sync. It never redoes a stage's own reasoning — refinement belongs to `close-the-gaps`, planning to `plan-the-work`, implementation to `execute`, review to `review-the-pr`.

**Pipeline checkpoint:** Before editing implementation code or tests, carry out Start's branch guard and create the ticket's workflow state and dashboard, then enter Context check. Follow the saved phase transitions and required stage skills through review and final sync. The size or apparent simplicity of a code change never waives a phase, handoff, log, or review. If a required stage cannot run, checkpoint its documented stop in the state instead of implementing the ticket directly. Do not report a ticket as complete merely because its code and tests pass; `status: Complete` requires the pipeline's terminal checks.

---

## Usage

```
/make-it-work:implement [TICKET-ID | path/to/spec.md] [--autopilot]
```

Or paste the ticket content directly into the chat after invoking.

- **`--autopilot`** — strip this flag before resolving the ticket or spec path. It runs the complete existing ticket-delivery pipeline without `AskUserQuestion` calls, forwarding `--autopilot` to every dispatched stage. It never commits, pushes, opens a PR, invokes `go-deep` or `define-test-strategy`, or guesses through a missing/contradictory required fact; those cases checkpoint a `Stopped` state with an actionable reason.
- **Ticket key or pasted content** — derive `<TICKET>` exactly as `close-the-gaps` Phase 1 does: the ticket ID; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD`.
- **Spec path** — `<TICKET>` is the file name without its `-spec.md` suffix.
- **No argument** — list `make-it-work/*-state.md` files whose `status` is not `Complete`. Exactly one → offer to resume it; under `--autopilot`, resume it only when its saved autonomy is `autopilot` and its workspace fingerprints still match. Several or none → ask the user; under `--autopilot`, stop with the matching no-safe-default reason.

## Autopilot mode

When invoked with `--autopilot`, construct every ordinary question/checkpoint payload exactly as the interactive path would, but do not call `AskUserQuestion` or wait. Set `autonomy: autopilot`, create `make-it-work/implement-autopilot-log.jsonl` fresh at the start of the run, and append each orchestration-level resolution with the shared schema in `docs/autopilot-log-schema.md`. Use `node "<base>/../../scripts/decision-log.mjs" init|append implement --root "<repo-root>"` in its own Bash call when Bash is available; a denied log write never blocks unrelated pipeline work.

Auto-resolve only these safe defaults: create the suggested ticket-named feature branch when starting on the base branch; retain a clean resumable autopilot run's saved mode; continue with clear related/unrelated regression classification; choose sequential dispatch; and replan when the existing Autonomous rules already prescribe replan. Forward `--autopilot` to `close-the-gaps`, `plan-the-work`, `execute`, and the Review dispatch; `execute` forwards it to `run-regression` for its completion gate.

Stop, record `chosen: null`, set `status: Stopped`, clear `current_activity`, regenerate the dashboard, and report the remediation when there is no safe default: no ticket or several resumable runs, detached HEAD, an existing completed/stopped run or standalone artifacts that would need a reuse/overwrite choice, changed worktree on resume, unresolved TBDs or plan blockers, uncertain regression ownership, an unavailable regression result, a review `Route: human` finding, or any stage's own hard stop. A normal terminal feedback retrospective never re-opens a successful run: write the best available share-safe diagnosis and retain material uncertainty in `openQuestions` rather than asking follow-ups.

At the terminal report, summarize auto-resolved decisions and the implement log path in addition to the normal completion/stop summary.

---

## Stage skills

The stage skills are siblings of this skill in the plugin. Take the `Base directory for this skill:` path printed when this skill loaded, and resolve:

- `<base>/../close-the-gaps/SKILL.md`
- `<base>/../plan-the-work/SKILL.md`
- `<base>/../execute/SKILL.md`
- `<base>/../review-the-pr/SKILL.md`

Read each one with the Read tool when its phase starts — **never** start them through the Skill tool; they are deliberately user-invoked only outside this orchestrator. Follow each skill's instructions including its `## When run by implement` section, passing the inputs that section names.

- Refinement, planning, and execution run inline in this session; under `--autopilot`, pass the flag so their own decision policies replace questions while `execute` dispatches its own per-step subagents.
- Review runs in a fresh subagent, for an independent read of the change (see Review dispatch).

If any of the four files is missing, stop and tell the user the exact path that could not be found. Do not improvise the stage.

The feedback retrospective's detailed contract is in `<base>/references/feedback.md`. Read it only after an eligible run has already reached its terminal state; ordinary in-progress phases do not need it.

For runs with `handoff_version: 1`, also read `<base>/references/handoffs.md` before the first stage. Each stage produces the versioned JSON result described there. Validate it and run the read-only `handoff.mjs next` helper after the stage; use its action to select the next phase or question. The Transition table below still specifies the side effects of each route and remains the compatibility path for older runs.

---

## Workflow state

The run's state lives in `make-it-work/<TICKET>-state.md`, next to the other pipeline artifacts. Create it with exactly this template:

````markdown
# Workflow state — <TICKET>

```
ticket: <TICKET>
handoff_version: 1             # new runs use validated JSON handoffs; absent on older runs
status: In Progress            # In Progress | Paused | Stopped | Complete
phase: context-check           # context-check | close-the-gaps | spec-approval | plan | plan-approval | execute | review | fix-plan | final-sync | final-approval | complete
final_package_version: 1       # new runs build a content-bound final package; absent on older runs
verification_version: 1        # new runs persist per-step and AC evidence; absent on older runs
autonomy: guided               # guided | autonomous | autopilot | pending — pending only between state-file creation and Choose autonomy completing (see Start)
start_time: none                # ISO 8601 UTC timestamp captured as the first action of Start; never fabricated or backfilled
plugin_version: none            # exact version from this plugin's .claude-plugin/plugin.json, captured once at Start; never changed or backfilled
execution_mode: none            # none | subagent-driven | inline — set once execute's Mode-selection phase runs
inline_pause_mode: none         # none | stop-after-each-step | run-straight-through — set only when execution_mode is inline
spec: none
spec_hash: none
plan: none
plan_version: 1                # 1 = the initial plan; each replan adds 1
plan_hash: none
execution: not-started         # not-started | running | passed | guardrail | retry-limit | gate-failed | gate-no-result | stopped
review: not-started            # not-started | clean | fix-required | replan-required | human-decision
review_cycle: 0                # reviews run for the current plan version (limit = fix_cycle's limit + 1 = 4 — one initial review plus one re-review per fix-plan round)
fix_cycle: 0                   # fix-plan rounds for the current plan version (limit 3 — review_cycle's limit is derived from this one, see its own comment)
fix_plan_round_steps: none      # step count added by the current fix-plan round; reset to none when a new fix-plan round begins
fix_plan_dispatch: none         # none | sequential | parallel — dispatch order for the current fix-plan round's own added steps; reset to none when a new fix-plan round begins; never set for the original plan's own steps
replans_used: 0                # limit 2 per run
gate: none                     # none | full-suite | scoped
pause_reason: none
branch: <current branch>
base: <base branch>
head: <commit hash>
worktree_fingerprint: <hash>
execute_report: none           # path of the last saved execute report
context_updated: none
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

**Checkpoint rule** — at every transition, rewrite the field block and append one row to the Audit log *before* starting the next phase. That row's `Time` cell is a real wall-clock timestamp in ISO 8601 UTC (e.g. `2026-01-01T12:00:00Z`, obtained via a shell `date` call or this session's own real clock) captured at the moment of this very checkpoint write — never estimated, guessed, or back-filled, for every row including the first one a run ever logs. After every phase that changes files (close-the-gaps, plan, fix-plan, execute, final-sync), re-record `head` and `worktree_fingerprint`. Whenever the user edits the spec or plan by hand at a pause, re-record `spec_hash` / `plan_hash` before the next phase starts. Immediately after rewriting the field block, also regenerate `make-it-work/<TICKET>-status.html` from the fields just written — never let the two fall out of sync (see Progress dashboard below).

**Fingerprints:**

- `head` = `git rev-parse HEAD`.
- `worktree_fingerprint` = `git hash-object --stdin` over the concatenated output of `{ git diff HEAD --binary -- . ':!make-it-work'; git ls-files --others --exclude-standard -z -- . ':!make-it-work' | xargs -0 -I{} git hash-object {}; }` — the tracked diff's bytes, followed by one `git hash-object` line per untracked file in `git ls-files`'s stable sorted order, all piped through a single final `git hash-object --stdin` call. This is one exact, reproducible pipeline, not two separate hashes to combine by hand — so an edit inside a new, untracked file changes the fingerprint too, and the same repo state always produces the same fingerprint.
- `spec_hash` = `git hash-object <spec>`.
- `plan_hash` = the same, over the plan with its `## Execution Status` section (from that header to the next `## ` header) removed — `execute` owns and updates that section.

**Base branch** — `base` is the branch this work will merge into: `git symbolic-ref --short refs/remotes/origin/HEAD` without its `origin/` prefix, or `main` when that fails. Show it in the start summary so the user can correct it.

---

## Progress dashboard

Alongside the state file, maintain a human-readable static snapshot at `make-it-work/<TICKET>-status.html`. Create it immediately after the first state-file write on Start → New run or Start → Pending offline refinement, then regenerate it after every later state mutation named by the Checkpoint rule or by a phase-specific instruction.

Dashboard rendering is deterministic code, not model-authored HTML. All ordinary dashboard refreshes must use the checkpoint helper — never edit a state field and then separately remember to invoke the renderer. Resolve `<base>` to this skill's directory exactly as in Stage skills, then run:

```sh
node "<base>/scripts/dashboard-checkpoint.mjs" render --state "make-it-work/<TICKET>-state.md"
```

For a narration/activity update, use the helper's one operation instead of manually writing `current_activity`: `node "<base>/scripts/dashboard-checkpoint.mjs" activity --state "make-it-work/<TICKET>-state.md" --activity "<exact narrated sentence or none>"`. The helper validates the state, replaces `current_activity` atomically, renders the dashboard, and restores the prior state if rendering fails. State transitions and Audit-log edits still use their existing write procedure, followed by the helper's `render` operation.

The renderer owns parsing and validating the state and current plan, calculating timing and loop-aware timeline state, escaping state-derived content, reading the fixed logo and HTML template from this skill's assets, and atomically replacing `<TICKET>-status.html`. Never reproduce, patch, or hand-edit the generated HTML. The state file and, while Execute or Fix needs step progress, its referenced plan are the renderer's only run-specific inputs.

**Never backfill** — when Resume finds a run with no status file, do not invoke the renderer merely to add one. Only tickets whose state file was first created through one of the two creation paths above participate in dashboard updates. Once a participating ticket has a dashboard, every required regeneration uses the same command.

**Renderer failure** — a nonzero exit means the state or referenced plan violates the dashboard contract, or the dashboard could not be written. Do not enter the next phase and do not append a transition row describing progress that did not occur. Report the renderer's error, correct the source state/plan when the correction is unambiguous, and rerun the command. Because the renderer writes atomically, an existing dashboard remains intact on failure.

**Logging a decision row:** whenever an `AskUserQuestion` resolution represents a consequential in-run decision that is *not itself a phase change* (a phase change already produces its own ordinary row — never double-logged as a decision row too), append an Audit-log row with `From` and `To` both equal to the current phase, and an `Outcome / reason` starting with `Decision: `. Examples: the autonomy-level choice (Start), the execution-mode choice and the inline-pause-mode choice (Execute), a fix-plan round's added-step count (Fix), and a fix round's Sequential-vs-Parallel dispatch choice.

Mention the dashboard path once, in whichever of Start's two creation points creates the state file first for this ticket (New run's first chat message, before Context Check or Choose Autonomy; or Pending offline refinement's stop message). Never repeat it at later checkpoints, and never mention it for Resume.

---

## Narration

Before any stretch of work that involves several tool calls with no natural pause point in between — reading multiple files to investigate something, writing and running a batch of tests, applying a fix and re-verifying it — say one plain sentence describing the high-level activity about to happen, then proceed without further narration until that chunk's natural conclusion. Not a sentence per tool call, and not a sentence per tiny sub-step — just enough that the user always knows what's currently happening without having to infer it from a string of tool calls.

Each such sentence must use the dashboard checkpoint helper's `activity` operation to update the state file's `current_activity` field and regenerate the dashboard, so the same "what's happening right now" signal is visible to someone reading the dashboard async, not only someone reading live chat:

- `current_activity` holds exactly the sentence just said in chat, or `none`.
- Clear it back to `none` the moment a new phase becomes the active phase, before that phase's own first narrated sentence lands — a sentence from a finished phase must never linger under the next phase's dot.
- Clear it back to `none` whenever `status` moves to `Paused` or `Stopped` — nothing is actively being done while waiting on the user, and the existing pause-reason banner already covers that state. A narrated sentence resumes the next time real work actually does.
- Rendered on the dashboard only while `status: In Progress` (see Progress dashboard above).

**Worked example — Start's own checkpoints.** Start is the stretch of work most likely to be someone's first impression of this pipeline, and it runs through several tool calls (branch guard, state-file/dashboard creation, Context check) with no interstitial text by default — apply the rule above explicitly here:

- After the branch guard resolves, say in one sentence what's about to happen, e.g. "Setting up the run — creating the state file and dashboard, then checking the project has the context this pipeline needs."
- After Context check's outcome (pass or stop), say so in one line before asking about autonomy.
- After autonomy is chosen, say what phase is starting next, e.g. "Starting refinement — I'll explore the relevant code and then ask clarifying questions." — before silently diving into Phase 2/3 code exploration.

---

## Start

Work through these checks in order; the first one that applies decides what happens.

1. **Branch guard**:
   - **`HEAD` is detached** → stop: tell the user to create or switch to a feature branch first. A run must never start on a detached HEAD — there is no branch for the work this run produces to live on.
   - **Current branch equals `base`** → compute a suggested branch name: `<TICKET>`; if `git rev-parse --verify --quiet refs/heads/<TICKET>` resolves (the name is already taken), try `<TICKET>-2`, `<TICKET>-3`, … incrementing until one does not resolve, and use that instead. Under `--autopilot`, choose `Create feature branch <suggested-name> (recommended)`, log that checkpoint, run `git switch -c <suggested-name>`, and stop with the command error if it fails — never proceed on the base branch. Otherwise ask with `AskUserQuestion`: *"You're on `<base>` — proceed anyway, or should I create a feature branch for you?"*, with these options:
     - Create feature branch `<suggested-name>` (recommended).
     - Proceed on `<base>` anyway.
     - Stop.

     If the user picks **Create feature branch**, confirm the exact name before creating anything: tell them "I'll create and switch to `<suggested-name>` — reply to confirm, or give a different branch name," and wait for their reply. Use whatever name they confirm or supply as `<final-name>`, then run `git switch -c <final-name>`. If that command fails (e.g. the name turned out to be taken after all), show the error and ask again for a different name — never silently retry with a guessed alternative. Once the branch is created, continue to the next Start check.

     If the user picks **Proceed on `<base>` anyway**, continue to the next Start check without creating a branch.

     If the user picks **Stop**, stop here, exactly as today's hard stop did.
   - **Neither condition applies** → continue to the next Start check.
2. **Completed run** — a state file exists with `status: Complete`, **or** with `status: Stopped` and `phase: context-check` → ask whether to start a new run (the state file is overwritten) or stop. Under `--autopilot`, stop rather than overwriting the state or artifacts. A run that never got past Context Check produced no artifacts worth resuming, so it is treated the same as a completed run's own re-run prompt, not routed into Resume.
3. **Run in progress** — a state file exists with any other status → go to **Resume**.
4. **Pending offline refinement** — `make-it-work/<TICKET>-questions.md` exists with `**Status:** Awaiting Answers` → before writing the state, read `<base>/../../.claude-plugin/plugin.json` and capture its exact nonempty `version` value as `plugin_version`; if the manifest cannot be read or has no version, stop and report that error rather than creating an unattributed run. Then create the state file with `phase: close-the-gaps`, `status: Paused`, `pause_reason: offline refinement pending`, a real captured timestamp in `start_time` (same capture rule as the Checkpoint rule's `Time` cell), and the progress dashboard (`make-it-work/<TICKET>-status.html` — see Progress dashboard below), mentioning the dashboard's path once in this stop message; tell the user to finish `/make-it-work:close-the-gaps <that path>` and then run `implement` again; stop.
5. **New run**:
   - Capture a real timestamp into `start_time` (same capture rule as the Checkpoint rule's `Time` cell).
   - Before the first state-file write, read `<base>/../../.claude-plugin/plugin.json` and record its exact nonempty `version` value in `plugin_version`. Do not derive it from the cache directory name, package metadata in the target repository, or a chat message. If the manifest cannot be read or has no version, stop and report that error rather than creating an unattributed run. `plugin_version` is immutable for the run: every later checkpoint, resume, and feedback write preserves it unchanged.
   - Create the state file with `phase: context-check`, `status: In Progress`, `autonomy: pending`, every other field at its template default (including `real_rows_from: 1`), and log the first Audit-log row: `From: start`, `To: context-check`, with an `Outcome / reason` summarizing whatever the branch guard just resolved (e.g. `New run created; branch <name> created per branch-guard choice` or `New run created; proceeding on <base>` — fold the branch-guard outcome into this one row's narrative; no separate row for it, since no state file existed while the branch guard ran).
   - Create the progress dashboard (`make-it-work/<TICKET>-status.html` — see Progress dashboard below) from those fields, and tell the user its path in the very first chat message of the run.
   - *Only then* run **Context check**. **If its outcome is "stop"** (no signal at all, or incomplete, per Context check's own Outcomes), set `status: Stopped` explicitly — not `Paused`: there is no mid-run point to resume into until the user has run `go-deep` externally and re-invokes `implement`, which is effectively a fresh attempt, not a resumable pause. Log this as the phase's own Audit-log row (`From`=`To`=`context-check`, `Outcome / reason`: the exact stop message shown to the user), regenerate the dashboard, then stop exactly as Context check's own Outcomes already specify.
   - If Context check succeeds, run **Choose autonomy** — when autonomy is chosen, update the `autonomy` field from `pending` to the chosen value, log a decision row (`From`/`To` both `context-check`) reading `Decision: Autonomy level selected — <Guided|Autonomous|Autopilot>`, and regenerate the dashboard (per the Checkpoint rule).
   - Then, exactly as today: if `make-it-work/<TICKET>-spec.md` and/or `make-it-work/<TICKET>-plan.md` already exist from standalone runs, show what was found and ask: reuse them and start at the next phase, or redo from that phase. Under `--autopilot`, stop rather than choosing between stale artifacts.
   - **Close out Context check explicitly** (new — this did not need stating before, since no state file existed at this point until now): once the reuse/redo decision above resolves, update `phase` to the actual starting phase (`close-the-gaps` for a fresh spec/plan, or `plan`/`execute` if reusing an existing one per the decision just made), and log the closing Audit-log row `context-check → <that phase>` with an outcome describing the decision, then regenerate the dashboard. This is what flips the pre-activated `context-check` dot from `current` to `passed`, exactly like any other phase's own closing row does.

---

## Context check

`implement` needs the project context `go-deep` builds, and checks for it in two layers:

- **Signals** (the same ones `go-deep`'s own prior-run detection uses): a `uc-*` or `domain-*` directory under `.claude/skills/`; a `CLAUDE.md` containing a Skill Loading Gate, Skills Reference, or After Any Feature Change section; `.claude/rules/architecture.md` or `.claude/rules/product.md`.
- **Completeness:** `CLAUDE.md` containing the Skill Loading Gate, `.claude/rules/architecture.md`, `.claude/rules/product.md`, and at least one `.claude/skills/domain-*/SKILL.md`.

Outcomes:

- **No signal at all** → stop: "No project context found. Run `/make-it-work:go-deep` first."
- **Some signals, but incomplete** → stop, list exactly which pieces are missing, and point the user to `go-deep`'s "Repair existing docs" mode.
- **Complete** → continue.

Never run `go-deep` yourself.

---

## Choose autonomy

Ask once, with a single `AskUserQuestion`, and save the answer to `autonomy`. When `--autopilot` is present, skip this question, save `autopilot`, and append the corresponding decision-log entry. Selecting **Autopilot** from this question has exactly the same effect as passing `--autopilot`.

- **Guided (Recommended)** — pauses for approval after the spec and after the plan, and for every human decision.
- **Autonomous** — no approval gates, and replans automatically when the plan stops holding. It still asks every question a stage asks and every uncertain regression, and it stops at the loop limits and at completion.

- **Autopilot** — runs without approval or stage-question prompts. It uses the policy in Autopilot mode and stops safely when no documented default exists.

Offer all three options interactively. Keep **Guided (Recommended)** as the recommended default.

---

## Resume

Compare the current `branch`, `head`, `worktree_fingerprint`, `spec_hash`, and `plan_hash` against the state file.

- **Nothing changed, and the last log row closed its phase** (the last Audit-log row's `From` differs from its `To` — a trailing same-phase decision row, per the merged-log design, never counts as closing a phase) → show one line (current phase and autonomy level), offer to change the autonomy level, then continue at `phase`. Under `--autopilot`, continue only if the saved autonomy is `autopilot`; otherwise stop rather than changing its mode. This bucket never applies while `phase: context-check`, even when its one logged row (`start → context-check`) technically has `From ≠ To` — that row only records *entering* Context Check, and Context Check's own mandatory follow-on orchestration (Choose autonomy, the reuse/redo prompt, the closing row) may not have run yet; a `phase: context-check` state always falls to the next bucket instead.
- **Interrupted mid-`context-check`, mid-`close-the-gaps`, mid-`review`, or mid-`final-sync`, with nothing else changed** → these phases are safe to repeat: tell the user, then re-run that phase from its start. For `context-check` specifically, "from its start" means re-entering Start check #5 at its "run Context check" bullet and continuing through it exactly as a New run would — Choose autonomy (re-asking if `autonomy` is still `pending`), the reuse/redo prompt, and the explicit closing row/phase-update — since that orchestration lives in Start, not in a `## Phases` subsection of its own.
- **Anything changed, or the run was interrupted mid-`plan`, mid-`fix-plan`, or mid-`execute`** (the phase started but has no closing log row) → list exactly what differs, then ask; under `--autopilot`, stop rather than choosing among Resume anyway, Redo, or Start over:
  - **Resume anyway** — re-record the fingerprints and continue. For an interrupted execute, run `execute` again; it resumes from its own Progress line.
  - **Redo the affected phase** — the earliest phase whose artifact changed; code changed outside the workflow → execute.
  - **Start over** — a new run for this ticket.

An early-replan row (`review → plan` or `fix-plan → plan`) is an ordinary replan entry: it is logged in the same checkpoint that bumps `replans_used` and `plan_version`, so a state with `phase: plan` and that row last resumes at `plan` in replan mode, never as a stale fix-plan round. An interruption before the row was logged leaves `phase: fix-plan` (or `review`) with the counters untouched; it takes the buckets above, and the early-replan triggers are re-checked on re-entry.

Ask this in both interactive autonomy levels. Never assume a changed repository is still safe to resume.

**Legacy-schema migration:** before applying any of the three outcomes above, check whether the state file's raw field block is missing the `real_rows_from` key entirely (it predates this feature). If so, add it — along with any other field-block key introduced by this feature or an earlier one that the file is missing, each at its template default **except `handoff_version`, `final_package_version`, `verification_version`, and `plugin_version`** — and set `real_rows_from` to one more than the state file's current Audit-log row count at this moment (every row already logged is legacy; every row logged from here on is real). Never add these version markers to an existing run: an older run continues with its original handoffs and completion path, and an old run without `plugin_version` remains explicitly unattributed rather than being backfilled with the currently installed version. This is the only migration Resume performs; it never touches a file that already has the key.

---

## Phases

Each phase reads its stage skill (see Stage skills), passes the inputs that skill's `## When run by implement` section names, and reads the stage's return report. A `handoff_version: 1` run routes through the validated handoff helper below; an older run follows the Transition table directly.

**Version 1 handoff routing:** pass `handoff_version: 1`, the current `plan_version`, and (for Review) `review_cycle` to every stage invocation. After `close-the-gaps`, `plan-the-work` (including amend mode), `execute`, or `review-the-pr` completes, read the new JSON handoff path from its return report. Validate the handoff with `<base>/scripts/handoff.mjs validate`, then call `handoff.mjs next` with the current state. Follow `<base>/references/handoffs.md` for options and follow-up calls. Never route from the prose outcome line alone in such a run. If validation or routing fails, checkpoint `Stopped` with the exact error and leave the current phase in place; on Resume, repair or rerun that phase and produce a new handoff. An absent handoff is an error, never a reason to fall back to prose. Do not increment a loop counter or advance a phase until the helper returns a valid route. The helper does not write the state or dashboard; this skill still performs the ordinary Checkpoint rule and all existing route side effects. Approval gates and decisions outside a completed stage continue under their existing instructions.

### Close the gaps

Follow `close-the-gaps` inline with the ticket, the autonomy level, and — when redoing the phase — the user's redo notes. Under `autopilot`, append `--autopilot` to the stage invocation. For a version 1 run, record `spec` and `context_updated` from the validated handoff and route its `tbd_items` through the helper. For an older run, use the report's `Spec:`, `Context updated:`, and `TBD items:` lines and the original question rule. In either case record `spec_hash` from the actual spec file.

### Spec approval (Guided only)

Show the spec path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. The user may edit the spec file before approving; record `spec_hash` at the moment of approval.

### Plan

Follow `plan-the-work` inline — initial mode while `plan_version = 1`, replan mode after a replan (with the previous plan path and the feedback path). Under `autopilot`, append `--autopilot` to the stage invocation. Pass the user's redo notes too when redoing the phase. For a version 1 run, record `plan` and `context_updated` from the validated handoff and route a baseline blocker through the helper. For an older run, use the report's `Plan:`, `Context updated:`, and `Blocked:` lines and the original Transition table. In either case record `plan_hash` from the actual plan file when one was completed.

### Plan approval (Guided only)

Show the plan path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. Record `plan_hash` at the moment of approval.

### Execute

Set `execution: running`, then follow `execute` inline with the plan path and the autonomy level. Under `autopilot`, append `--autopilot`, which also makes its completion gate invoke `run-regression --autopilot`. For a participating dashboard, pass the exact state-file path `make-it-work/<TICKET>-state.md` as execute's dashboard state path; if this is an older resumed run with no dashboard, omit it to preserve the no-backfill rule. `execute` owns the required render immediately after every durable step/batch Progress advance, so the same execution session that verified the step cannot dispatch the next one with a stale dashboard. Whenever the next not-yet-done step's own number is greater than `M − fix_plan_round_steps` (i.e. it belongs to the current fix-plan round's own added steps, not the original plan) — a plain comparison against numbers already in the state file, so this stays correct across an interrupted-and-resumed execute within the same round without depending on which Transition-table row most recently fired — also pass `fix_plan_dispatch`'s current value (`sequential` or `parallel`) as an additional input to `execute`. For the original plan's own steps (resume point at or below that boundary), never pass this input at all. Also, when execution_mode or inline_pause_mode is first chosen for this plan version, record it in the state file's `execution_mode`/`inline_pause_mode` fields and log a decision row for it (per the decision-row-logging paragraph above) before the first per-step dispatch. Read its outcome lines:

- For a version 1 run, read `outcome`, `discoveries`, `failing_tests`, and `gate` from the validated handoff and record the corresponding execution state; use `failing_tests` as Gate triage input. When `verification_version: 1`, also pass that marker, the ticket, plan version, and artifact root to `execute`. Read and validate its `artifacts.verification` path; a missing ledger is a stop, not a prose fallback.
- For an older run, use `Execute outcome:`, `Discoveries:`, and `Failing tests:` from the prose report, and record `gate` from the `Mode:` line of the `run-regression` block (`Full suite` → `full-suite`, `Scoped` → `scoped`).

For an older run, save execute's terminal report (whichever stop, gate, or final report it printed) together with its outcome lines to `make-it-work/<TICKET>-execute.md`, overwriting any earlier one. For a `handoff_version: 1` run, `execute` saved that same report before writing its handoff; read it and do not overwrite it. In either case record that path in `execute_report`. This is the feedback replan and fix-plan (gate) read, so it must survive a pause or an interrupted session.

A missing or unreadable outcome line is treated as `EXECUTE_STOPPED` only for an older run; a version 1 run treats an absent or invalid handoff as a validation error.

If the developer accepts the existing `GATE_NO_RESULT` manual-walkthrough route in a `verification_version: 1` run, update only the ledger's `gate` to `mode: none`, `result: manual-accepted`, with the decision and actual manual walkthrough in `note`; keep ACs without passing manual step evidence marked `unverified`. Validate the ledger again. This records the existing decision, not a new validation phase or an inferred pass.

### Gate triage (on `GATE_FAILED`)

Classify every failing test that is not already listed under Known regressions:

- **Related** — the plan names it (in a step's `**Tests:**` field or a `## Test Plan` row), it lives in a file listed in the plan's Affected Code, or its path carries one of the spec's use-case or domain tags (per the project's tag convention in `.claude/rules/testing-strategy.md`, when that file exists).
- **Unrelated** — none of the above.
- **Uncertain** — the evidence points both ways, or the failing test can't be identified. Ask the user about each one (related → fix it / unrelated → document it) in both interactive autonomy levels; under `autopilot`, stop rather than classifying it.

Append every unrelated test to Known regressions, and append the final related / unrelated split to the file `execute_report` names. Unrelated regressions are documented, never fixed in this run. In Guided, also show the final related/unrelated split and ask: **Fix the related ones** / **Treat all as unrelated and continue** / **Stop**. Autopilot follows the already-computed clear split without a second prompt.

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
| context-check | complete | choose autonomy | choose autonomy |
| context-check | missing or incomplete | stop | stop |
| close-the-gaps | spec saved | spec-approval | plan |
| spec-approval / plan-approval | approve | next phase | — |
| spec-approval / plan-approval | redo | re-run the phase with the notes | — |
| spec-approval / plan-approval | stop | stop | — |
| plan | plan saved | plan-approval | execute |
| plan / fix-plan | `Blocked:` pre-existing failing regression | ask: call it out and proceed / stop | ask: call it out and proceed / stop |
| execute | `PASSED` | review | review |
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
- when `gate: none` (the completion gate was skipped per the `GATE_NO_RESULT` handling above), also pass a note that the automated gate was skipped and the plan's `## Test Plan` rows should be verified manually as part of the regression-safety pass;
- for `verification_version: 1`, pass the verified `make-it-work/<TICKET>-verification-v<plan_version>.json` path. Ask Review to read it against the plan's AC traceability table, treating `unverified` rows as visible gaps rather than assuming the full-suite result proves them. Review does not rerun tests merely to populate evidence.
- ask it to return the chat summary, ending with the `Orchestrator outcome:` line for an older run, or that line followed by `Handoff: <path>` for a version 1 run.

Then read `make-it-work/<TICKET>-review.md`. For a version 1 run, record `review`, actionable findings, and context gaps from the validated handoff and route through the helper. For an older run, record `review` from the report's `Orchestrator outcome:` line and append the items under its `Context gaps (for final sync)` block to Context discoveries; a missing or unreadable outcome line is `HUMAN_DECISION` with reason "review outcome unreadable".

---

## Final context sync

Runs only after review comes back `CLEAN`. Its job is to make the project's knowledge base describe the system as it now is — reusable knowledge for future work, not a record of this ticket.

**Inputs:**

- The full change: `git diff $(git merge-base <base> HEAD)` plus untracked files, excluding `make-it-work/`.
- Context discoveries collected during the run (from `execute` and from review's context gaps).
- The spec and the current plan.
- The documentation items of the project's `CLAUDE.md` "After Any Feature Change" checklist and its quick-lookup table — not its test-running or commit-time items.

**For each piece of changed or newly learned behavior, choose one:**

- Update the existing `domain-*` or `uc-*` skill that covers it.
- Create a new skill when no existing one fits, and register it everywhere `CLAUDE.md`'s checklist says (Skills Reference, the Functional Domains table in `architecture.md`, the UC table in `product.md` for a new flow, the quick-lookup table).
- Update `.claude/rules/architecture.md` or `.claude/rules/product.md` when the change alters system-level understanding.
- Change nothing, when nothing reusable was learned.

Follow `go-deep`'s rules: UC skills describe what the user does and sees, domain skills describe how it is built and where the code lives; keep to the size targets; keep only what someone could not learn by reading the code. Never mention the ticket, its ID, or "this change added…".

Write the updates directly, without a confirmation step, at both autonomy levels. Add the files changed to `context_updated`.

For a run with `final_package_version: 1`, checkpoint `final-sync → final-approval` after these updates and regenerate the dashboard. The package captures the finished tree, including these documentation changes. An older run follows its existing `final-sync → complete` transition.

---

## Final approval package

This section applies only when the state has `final_package_version: 1`. It never commits, pushes, or opens a PR. The local helper is `<base>/scripts/final-package.mjs`.

1. Resolve the exact affected repo roots from the plan's `## Affected Code` sections and the workspace service map. For one repo, use its git root. For more than one, pass each root explicitly; pass its base branch with a paired `--base` when the state's `base` does not apply to every repo. Do not add unrelated repos. If a repo or base is ambiguous, ask the developer (Autopilot: stop).
2. Write `make-it-work/<TICKET>-final-draft.json` with `commit_message`, `pr_title`, and `pr_description`. Draft text summarizes the implemented behavior, acceptance-criteria coverage, validation, and notes for reviewers. It is a draft only; nothing is delivered externally. Keep secrets out.
3. Run `node "<base>/scripts/final-package.mjs" build --root <artifact-root> --state <state-path> --draft <draft-path> --repo <repo-root> [--repo <other-root> ...] [--base <base-for-first-repo> --base <base-for-second-repo> ...]`. The helper writes `make-it-work/<TICKET>-final-package.md`, its JSON manifest, and one binary-safe diff per repo. It returns the package SHA-256. If it fails, stop with its specific error and repair the source; never claim that a package exists when build failed.
4. Show the package path, changed paths, validation mode/result, review outcome, any known regressions or open nits, AC verification status when the ledger exists, and the full proposed commit and PR text. In Guided mode ask **Approve** / **Request changes** / **Stop**. Only an explicit Approve of this exact package hash permits `node "<base>/scripts/final-package.mjs" approve --root <artifact-root> --state <state-path> --hash <shown-hash>`. In Autonomous and Autopilot, create and verify the package without asking; changes remain local and uncommitted.
5. Immediately before Completion, run `final-package.mjs check --root <artifact-root> --state <state-path> --require-approval` for Guided, or omit `--require-approval` for Autonomous/Autopilot. A failed check prevents Completion. A changed draft or package presentation requires rebuilding the package and, in Guided, asking again. A changed code, test, documentation, spec, plan, or validation artifact requires rerunning the affected Execute validation/Review/Final context sync work before rebuilding. The previous approval file may stay as history, but its old hash no longer approves the new package.

On **Request changes**, save the developer's notes in `make-it-work/<TICKET>-final-feedback.md`. Draft-text-only feedback updates the draft, rebuilds the package, and returns to this gate. For implementation or documentation feedback, feed that file to `plan-the-work` in amend mode through the existing Fix path, then Execute, Review, Final context sync, and build a new package; the existing fix and review limits apply. Feedback that changes the approach or requirements uses the existing Replan route and its limit. On **Stop**, checkpoint the reason and wait for a new invocation. Resume in `final-approval` must run the helper's `check` before accepting any saved approval.

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
- **Validation** — from `execute`'s final report: steps completed and the completion-gate mode and result, or `gate: none` with the manual Test Plan walkthrough when the user chose to continue without an automated gate.
- **Known regressions** — each one, marked unrelated, stating plainly that they were documented, not fixed. Omit when there are none.
- **Review** — the verdict, how many review and fix cycles it took, and any Minor findings left unfixed.
- **Final package** — for a new run, its path and whether Guided approval was recorded; omit for older runs.
- **Optional delivery** — if the developer wants a commit, push, and PR after this run, point to the separate `/make-it-work:deliver <TICKET>` command. Do not invoke it or treat final-package approval as delivery approval.
- **Context updated** — every file changed by `close-the-gaps`, `plan-the-work`, and the final sync, or "none".
- **Replans used** — the count.
- **Workflow feedback** — `make-it-work/implement-feedback.md`, stating whether this run was recorded as minimal or received a detailed retrospective. If feedback could not be written, state why instead.
- **Elapsed** — if `start_time` is a real captured timestamp (not `none`), the plain delta between it and this transition's own just-logged timestamp, as a human-readable duration (e.g. "2h 14m") — convert both ISO timestamps to epoch seconds via the host's `date` utility and subtract; this is a duration, not a display timestamp, so no timezone conversion is needed. If `start_time` is `none` (this run began before real start-timestamp capture existed), state "Elapsed: unknown — no real start timestamp was captured for this run" instead of estimating or backfilling one.
- **Cost** — not shown; no tool surfaces token-usage or billing data to this session. Check your own client's `/usage` command instead.

End with: "Changes are uncommitted — review the working tree and commit when ready." then, on its own line: "This ticket's artifacts (spec/plan/execute/review/state/dashboard) are in `make-it-work/` and aren't committed — delete them yourself whenever you're done referencing this run. `make-it-work/implement-feedback.md` is cumulative and separate; keep it if you plan to review or share the workflow feedback." This is a plain reminder, not a question — never ask for confirmation, and never delete anything.

---

## Rules

- Never commit anything, push, or open a PR.
- Never start on a detached HEAD. Never start on the base branch unless the user explicitly chose to proceed anyway at the branch guard.
- Never run `go-deep`, and never start a stage skill through the Skill tool.
- Never skip a checkpoint write, and never exceed a limit in the Transition table.
- Never answer a stage's question on the user's behalf, and never classify an uncertain regression without asking — except when `--autopilot` invokes that stage's own documented autopilot resolution. Autopilot never resolves its documented hard stops.
- Never fix a regression classified as unrelated.
- Never upload or automatically submit `make-it-work/implement-feedback.md`, and never include the project identifiers forbidden by its feedback reference.
- Never backfill `make-it-work/<TICKET>-status.html` for a run resumed with the file already missing — it is only ever created the first time a ticket's state file is created (Start → New run or Start → Pending offline refinement).
- Never fabricate or estimate a timestamp, a cost figure, or a duration computed from a missing real anchor — state plainly when a figure isn't knowable instead.
- Every duration or delta shown in the dashboard is computed by the renderer from real captured timestamps; never calculate or insert one by hand. Client-side JavaScript converts absolute timestamps into the viewer's local display time only.
- Default any open-ended investigation or multi-file/multi-repo exploration this skill performs directly — not already delegated to a stage skill's own instructions — to a fresh subagent dispatch (Agent tool), the same way Review dispatch and per-step Execute already do; work from the returned report rather than accumulating the raw investigation inline. Final context sync's own diff/documentation-impact analysis is the clearest example of this: when the change diff is large or several candidate skills/docs need evaluating, fork that analysis out instead of reading everything in this session.
- Never let a write to the state file's `## Known regressions` or `## Decided findings` sections, or to its `current_activity` field, wait for the next phase checkpoint to reach the dashboard — regenerate it immediately after that write, wherever it happens (e.g. Gate triage appending an unrelated regression; a review outcome recording a Decided finding; a Narration sentence being said), per the Checkpoint rule's own regeneration step.
