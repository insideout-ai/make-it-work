---
name: implement
description: "Orchestrates the make-it-work pipeline for one ticket — context check → close-the-gaps → plan-the-work → execute → review-the-pr → final context sync — with saved, resumable workflow state, two autonomy levels (Guided, Autonomous), and capped fix/replan loops. Never commits implementation changes, pushes, or opens a PR. Use when taking a ticket from request to a reviewed, context-synced implementation in one run."
disable-model-invocation: true
---

# Implement

**Role:** Act as a thin orchestrator for the make-it-work pipeline.

**Goal:** Take one ticket from request to a reviewed, context-synced implementation by running the existing stage skills in order. `implement` decides which phase runs next, runs that stage skill, interprets the outcome it reports, records the transition, enforces the loop limits, and performs the final context sync. It never redoes a stage's own reasoning — refinement belongs to `close-the-gaps`, planning to `plan-the-work`, implementation to `execute`, review to `review-the-pr`.

---

## Usage

```
/make-it-work:implement [TICKET-ID | path/to/spec.md]
```

Or paste the ticket content directly into the chat after invoking.

- **Ticket key or pasted content** — derive `<TICKET>` exactly as `close-the-gaps` Phase 1 does: the ticket ID; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD`.
- **Spec path** — `<TICKET>` is the file name without its `-spec.md` suffix.
- **No argument** — list `make-it-work/*-state.md` files whose `status` is not `Complete`. Exactly one → offer to resume it. Several → ask which one. None → ask the user for a ticket.

---

## Stage skills

The stage skills are siblings of this skill in the plugin. Take the `Base directory for this skill:` path printed when this skill loaded, and resolve:

- `<base>/../close-the-gaps/SKILL.md`
- `<base>/../plan-the-work/SKILL.md`
- `<base>/../execute/SKILL.md`
- `<base>/../review-the-pr/SKILL.md`

Read each one with the Read tool when its phase starts — **never** start them through the Skill tool; they are deliberately user-invoked only outside this orchestrator. Follow each skill's instructions including its `## When run by implement` section, passing the inputs that section names.

- Refinement, planning, and execution run inline in this session, because they ask the user questions and `execute` dispatches its own per-step subagents.
- Review runs in a fresh subagent, for an independent read of the change (see Review dispatch).

If any of the four files is missing, stop and tell the user the exact path that could not be found. Do not improvise the stage.

---

## Workflow state

The run's state lives in `make-it-work/<TICKET>-state.md`, next to the other pipeline artifacts. Create it with exactly this template:

````markdown
# Workflow state — <TICKET>

```
ticket: <TICKET>
status: In Progress            # In Progress | Paused | Stopped | Complete
phase: context-check           # context-check | close-the-gaps | spec-approval | plan | plan-approval | execute | review | fix-plan | final-sync | complete
autonomy: guided               # guided | autonomous
start_time: none                # ISO 8601 UTC timestamp captured as the first action of Start; never fabricated or backfilled
execution_mode: none            # none | subagent-driven | inline — set once execute's Mode-selection phase runs
inline_pause_mode: none         # none | stop-after-each-step | run-straight-through — set only when execution_mode is inline
spec: none
spec_hash: none
plan: none
plan_version: 1                # 1 = the initial plan; each replan adds 1
plan_hash: none
execution: not-started         # not-started | running | passed | guardrail | retry-limit | gate-failed | gate-no-result | stopped
review: not-started            # not-started | clean | fix-required | replan-required | human-decision
review_cycle: 0                # reviews run for the current plan version (limit 5)
fix_cycle: 0                   # fix-plan rounds for the current plan version (limit 3)
fix_plan_round_steps: none      # step count added by the current fix-plan round; reset to none when a new fix-plan round begins
replans_used: 0                # limit 2 per run
gate: none                     # none | full-suite | scoped
pause_reason: none
branch: <current branch>
base: <base branch>
head: <commit hash>
worktree_fingerprint: <hash>
execute_report: none           # path of the last saved execute report
context_updated: none
```

## Known regressions

None

## Decided findings

None

## Context discoveries

None

## Transition log

| # | Time | From | To | Outcome / reason |
| --- | --- | --- | --- | --- |

## Decisions log

| # | Time | Decision | Choice |
| --- | --- | --- | --- |
````

**Checkpoint rule** — at every transition, rewrite the field block and append one row to the transition log *before* starting the next phase. After every phase that changes files (close-the-gaps, plan, fix-plan, execute, final-sync), re-record `head` and `worktree_fingerprint`. Whenever the user edits the spec or plan by hand at a pause, re-record `spec_hash` / `plan_hash` before the next phase starts. Immediately after rewriting the field block, also regenerate `make-it-work/<TICKET>-status.html` from the fields just written — never let the two fall out of sync (see Progress dashboard below).

**Fingerprints:**

- `head` = `git rev-parse HEAD`.
- `worktree_fingerprint` = `git hash-object --stdin` over the concatenated output of `{ git diff HEAD --binary -- . ':!make-it-work'; git ls-files --others --exclude-standard -z -- . ':!make-it-work' | xargs -0 -I{} git hash-object {}; }` — the tracked diff's bytes, followed by one `git hash-object` line per untracked file in `git ls-files`'s stable sorted order, all piped through a single final `git hash-object --stdin` call. This is one exact, reproducible pipeline, not two separate hashes to combine by hand — so an edit inside a new, untracked file changes the fingerprint too, and the same repo state always produces the same fingerprint.
- `spec_hash` = `git hash-object <spec>`.
- `plan_hash` = the same, over the plan with its `## Execution Status` section (from that header to the next `## ` header) removed — `execute` owns and updates that section.

**Base branch** — `base` is the branch this work will merge into: `git symbolic-ref --short refs/remotes/origin/HEAD` without its `origin/` prefix, or `main` when that fails. Show it in the start summary so the user can correct it.

---

## Progress dashboard

Alongside the state file, maintain a human-readable status page at `make-it-work/<TICKET>-status.html` — a static snapshot the user opens in a browser, not a live view. It is created once, the first time a ticket's state file is created (Start → New run, or Start → Pending offline refinement, whichever creates it first), immediately after that first write, then fully regenerated at every later checkpoint, per the Checkpoint rule above, from the fields that checkpoint just wrote. **Never backfilled** — a run already in progress when this feature ships, resumed with no status file, is not given one retroactively; it only appears for a ticket whose state file is first created after this feature exists.

Write it with exactly this template, filling in every bracketed placeholder from the state file's own fields at the moment of the write — introduce no field this file doesn't already track:

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title><TICKET> — implement status</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1 { font-size: 1.3rem; }
  .pill { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 1rem; font-size: 0.85rem; background: #eee; margin-right: 0.3rem; }
  table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 0.3rem 0.5rem; font-size: 0.9rem; }
  .next-action { background: #fff6e0; border: 1px solid #e8d9a0; padding: 0.75rem 1rem; border-radius: 0.4rem; }
  .complete { background: #e6f4ea; border: 1px solid #b7dfc0; padding: 0.75rem 1rem; border-radius: 0.4rem; }
</style>
</head>
<body>
<h1><TICKET> — implement status</h1>
<p><span class="pill">Phase: <PHASE></span><span class="pill">Status: <STATUS></span><span class="pill">Autonomy: <AUTONOMY></span></p>

<!-- only when status is Paused or Stopped -->
<p class="next-action"><strong>Waiting on you:</strong> <PAUSE_REASON></p>

<!-- only when status is Complete -->
<p class="complete"><strong>Run complete.</strong></p>

<h2>Cycle counters</h2>
<p>Review cycles: <REVIEW_CYCLE> / 5 &nbsp; Fix cycles: <FIX_CYCLE> / 3 &nbsp; Replans used: <REPLANS_USED> / 2</p>

<h2>Artifacts</h2>
<ul>
  <li>Spec: <SPEC_LINK_OR_NONE></li>
  <li>Plan: <PLAN_LINK_OR_NONE></li>
  <li>Execute: <EXECUTE_REPORT_LINK_OR_NONE></li>
  <li>Review: <REVIEW_LINK_OR_NONE></li>
</ul>

<h2>Known regressions</h2>
<KNOWN_REGRESSIONS_LIST_OR_NONE>

<h2>Decided findings</h2>
<DECIDED_FINDINGS_LIST_OR_NONE>

<h2>Transition log</h2>
<table>
<tr><th>#</th><th>Time</th><th>From</th><th>To</th><th>Outcome / reason</th></tr>
<TRANSITION_LOG_ROWS>
</table>
</body>
</html>
```

Filling in the bracketed placeholders:

- `<TICKET>`, `<PHASE>`, `<STATUS>`, `<AUTONOMY>`, `<REVIEW_CYCLE>`, `<FIX_CYCLE>`, `<REPLANS_USED>` — copied verbatim from the state file's field block.
- The "Waiting on you" paragraph is included only when `status` is `Paused` or `Stopped`, using the state file's own `pause_reason` field verbatim — the same explanation already given to the user in chat at that stop, per the Stop definition elsewhere in this file. Omit this paragraph entirely for any other status.
- The "Run complete" banner is included only when `status` is `Complete`. Omit it for any other status.
- `<SPEC_LINK_OR_NONE>` / `<PLAN_LINK_OR_NONE>` / `<EXECUTE_REPORT_LINK_OR_NONE>` — an `<a href="...">` link to the file named in the state file's `spec` / `plan` / `execute_report` field, with that field's own `make-it-work/` prefix stripped from the `href` — the dashboard and these artifacts all live in the same `make-it-work/` directory, so the link only needs the bare filename (e.g. `href="<TICKET>-spec.md"`); the link text may keep the field's full value. Print the literal text `Not yet created` for any of these three whose state field still reads `none`.
- `<REVIEW_LINK_OR_NONE>` — once the state file's `review` field reads anything other than `not-started`, a link to `<TICKET>-review.md` (bare filename, same stripping rule as above); while `review` still reads `not-started`, print `Not yet created` instead. This reflects the current plan version's review status only — if a replan resets `review` back to `not-started`, show `Not yet created` again even if an older review file from a prior plan version is still on disk.
- `<KNOWN_REGRESSIONS_LIST_OR_NONE>` / `<DECIDED_FINDINGS_LIST_OR_NONE>` — an `<ul>` with one `<li>` per entry under the state file's `## Known regressions` / `## Decided findings` sections, or the literal text `<p>None</p>` when that section reads `None`.
- `<TRANSITION_LOG_ROWS>` — one `<tr>` per row of the state file's own `## Transition log` table, in the same order, each cell copied verbatim.

Mention the file's path once, in whichever of Start's two creation points actually creates the state file first for this ticket (New run's summary, alongside the autonomy level and base branch; or Pending offline refinement's stop message) — never repeated at later checkpoints, and never shown at all for a Resume (per the no-backfill rule above).

---

## Start

Work through these checks in order; the first one that applies decides what happens.

1. **Branch guard**:
   - **`HEAD` is detached** → stop: tell the user to create or switch to a feature branch first. A run must never start on a detached HEAD — there is no branch for the work this run produces to live on.
   - **Current branch equals `base`** → compute a suggested branch name: `<TICKET>`; if `git rev-parse --verify --quiet refs/heads/<TICKET>` resolves (the name is already taken), try `<TICKET>-2`, `<TICKET>-3`, … incrementing until one does not resolve, and use that instead. Then ask with `AskUserQuestion`: *"You're on `<base>` — proceed anyway, or should I create a feature branch for you?"*, with these options:
     - Create feature branch `<suggested-name>` (recommended).
     - Proceed on `<base>` anyway.
     - Stop.

     If the user picks **Create feature branch**, confirm the exact name before creating anything: tell them "I'll create and switch to `<suggested-name>` — reply to confirm, or give a different branch name," and wait for their reply. Use whatever name they confirm or supply as `<final-name>`, then run `git switch -c <final-name>`. If that command fails (e.g. the name turned out to be taken after all), show the error and ask again for a different name — never silently retry with a guessed alternative. Once the branch is created, continue to the next Start check.

     If the user picks **Proceed on `<base>` anyway**, continue to the next Start check without creating a branch.

     If the user picks **Stop**, stop here, exactly as today's hard stop did.
   - **Neither condition applies** → continue to the next Start check.
2. **Completed run** — a state file exists with `status: Complete` → ask whether to start a new run (the state file is overwritten) or stop.
3. **Run in progress** — a state file exists with any other status → go to **Resume**.
4. **Pending offline refinement** — `make-it-work/<TICKET>-questions.md` exists with `**Status:** Awaiting Answers` → create the state file with `phase: close-the-gaps`, `status: Paused`, `pause_reason: offline refinement pending`, and the progress dashboard (`make-it-work/<TICKET>-status.html` — see Progress dashboard below), mentioning the dashboard's path once in this stop message; tell the user to finish `/make-it-work:close-the-gaps <that path>` and then run `implement` again; stop.
5. **New run** — run **Context check**, then **Choose autonomy**. Then, if `make-it-work/<TICKET>-spec.md` and/or `make-it-work/<TICKET>-plan.md` already exist from standalone runs, show what was found and ask: reuse them and start at the next phase, or redo from that phase. Create the state file and the progress dashboard (`make-it-work/<TICKET>-status.html` — see Progress dashboard below), mention the dashboard's path once here, and log the first transition.

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

Ask once, with a single `AskUserQuestion`, and save the answer to `autonomy`:

- **Guided (Recommended)** — pauses for approval after the spec and after the plan, and for every human decision.
- **Autonomous** — no approval gates, and replans automatically when the plan stops holding. It still asks every question a stage asks and every uncertain regression, and it stops at the loop limits and at completion.

Offer only these two levels.

---

## Resume

Compare the current `branch`, `head`, `worktree_fingerprint`, `spec_hash`, and `plan_hash` against the state file.

- **Nothing changed, and the last log row closed its phase** → show one line (current phase and autonomy level), offer to change the autonomy level, then continue at `phase`.
- **Interrupted mid-`close-the-gaps`, mid-`review`, or mid-`final-sync`, with nothing else changed** → these phases are safe to repeat: tell the user, then re-run that phase from its start.
- **Anything changed, or the run was interrupted mid-`plan`, mid-`fix-plan`, or mid-`execute`** (the phase started but has no closing log row) → list exactly what differs, then ask:
  - **Resume anyway** — re-record the fingerprints and continue. For an interrupted execute, run `execute` again; it resumes from its own Progress line.
  - **Redo the affected phase** — the earliest phase whose artifact changed; code changed outside the workflow → execute.
  - **Start over** — a new run for this ticket.

Ask this in both autonomy levels. Never assume a changed repository is still safe to resume.

---

## Phases

Each phase reads its stage skill (see Stage skills), passes the inputs that skill's `## When run by implement` section names, reads the stage's return report, then follows the Transition table.

### Close the gaps

Follow `close-the-gaps` inline with the ticket, the autonomy level, and — when redoing the phase — the user's redo notes. From its return report, record `spec` and `spec_hash`, and add its `Context updated:` files to `context_updated`. If `TBD items` is above zero, that is a human decision: ask whether to resolve the TBD items now (re-run refinement on them) or proceed with them open.

### Spec approval (Guided only)

Show the spec path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. The user may edit the spec file before approving; record `spec_hash` at the moment of approval.

### Plan

Follow `plan-the-work` inline — initial mode while `plan_version = 1`, replan mode after a replan (with the previous plan path and the feedback path). Pass the user's redo notes too when redoing the phase. From its return report, record `plan` and `plan_hash`, and add its `Context updated:` files to `context_updated`. If it returns `Blocked:`, follow the Transition table.

### Plan approval (Guided only)

Show the plan path and ask: **Approve** / **Redo this phase** (with notes) / **Stop**. Record `plan_hash` at the moment of approval.

### Execute

Set `execution: running`, then follow `execute` inline with the plan path and the autonomy level. Read its outcome lines:

- `Execute outcome:` → record `execution`.
- `Discoveries:` → append to Context discoveries.
- `Failing tests:` (on `GATE_FAILED`) → input to Gate triage.
- Record `gate` from the `Mode:` line of the `run-regression` report block execute printed (`Full suite` → `full-suite`, `Scoped` → `scoped`).

Then save execute's terminal report (whichever stop, gate, or final report it printed) together with its outcome lines to `make-it-work/<TICKET>-execute.md`, overwriting any earlier one, and record that path in `execute_report`. This is the feedback replan and fix-plan (gate) read, so it must survive a pause or an interrupted session.

A missing or unreadable outcome line is treated as `EXECUTE_STOPPED`.

### Gate triage (on `GATE_FAILED`)

Classify every failing test that is not already listed under Known regressions:

- **Related** — the plan names it (in a step's `**Tests:**` field or a `## Test Plan` row), it lives in a file listed in the plan's Affected Code, or its path carries one of the spec's use-case or domain tags (per the project's tag convention in `.claude/rules/testing-strategy.md`, when that file exists).
- **Unrelated** — none of the above.
- **Uncertain** — the evidence points both ways, or the failing test can't be identified. Ask the user about each one (related → fix it / unrelated → document it), in both autonomy levels.

Append every unrelated test to Known regressions, and append the final related / unrelated split to the file `execute_report` names. Unrelated regressions are documented, never fixed in this run. In Guided, also show the final related/unrelated split and ask: **Fix the related ones** / **Treat all as unrelated and continue** / **Stop**.

### Review

Increment `review_cycle`, then dispatch the review as described in Review dispatch.

### Fix plan

Follow `plan-the-work` inline in amend mode, with one fix source: the review report (plus the user's decisions on any `Route: human` findings), or `execute_report` (which holds the gate report and the related failing tests). Afterwards record `plan_hash`, and re-record `head` and `worktree_fingerprint`. Increment `fix_cycle` only if steps were added — a round that adds none (every finding was accepted as-is) does not count against the limit. Then follow the Transition table: added steps → Execute (it resumes at the first added step); no steps → Review.

### Final context sync

See Final context sync below.

---

## Transition table

Every transition is listed here. `—` means the outcome cannot occur at that level.

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
| review | `review_cycle = 5` and not `CLEAN` | stop (review limit reached) | stop (review limit reached) |
| review | `CLEAN` | final-sync | final-sync |
| review | `FIX_REQUIRED`, `fix_cycle < 3` | fix-plan (review) | fix-plan (review) |
| review | `FIX_REQUIRED`, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| review | `REPLAN_REQUIRED` | first ask about any `Route: human` findings (record under Decided findings); then replan if `replans_used < 2`, else stop | same as Guided |
| review | `HUMAN_DECISION` | ask about each `Route: human` finding and record each decision under Decided findings; then fix-plan (review) with the answers — `fix_cycle` limit applies | same as Guided |
| fix-plan | steps added | execute | execute |
| fix-plan | no steps added (every finding accepted as-is) | review | review |
| final-sync | done | complete | complete |

**Replan** — `replans_used += 1`; `plan_version += 1`; `review_cycle = 0`; `fix_cycle = 0`; `execution` and `review` back to `not-started`; then Plan in replan mode, passing the previous plan path, one feedback path — `execute_report` after an execute stop, or the review report after `REPLAN_REQUIRED` (whose `Route: fix` findings are constraints for the new plan too) — and the Decided findings list, every entry of which is also a constraint. In Guided the new plan goes through plan approval again, and `execute` will ask for the execution mode again, since each new plan version starts with it unchosen.

**Stop** — set `status: Stopped` when a limit or cap was reached or the user chose to stop, or `status: Paused` when the run is waiting on the user. Set `pause_reason`, then tell the user where the run stopped, why, and what to do before running `implement` again. A resumed Paused run continues at its saved `phase`.

---

## Review dispatch

Dispatch one fresh subagent (Agent tool, `general-purpose`). Its prompt must:

- give the absolute path of `review-the-pr/SKILL.md` and say to follow it, including its `## When run by implement` section;
- pass the ticket key, the spec path, the current plan path, `base`, the literal `no PR`, the review cycle number, the Known regressions list, and the Decided findings list;
- when `gate: none` (the completion gate was skipped per the `GATE_NO_RESULT` handling above), also pass a note that the automated gate was skipped and the plan's `## Test Plan` rows should be verified manually as part of the regression-safety pass;
- ask it to return the chat summary, ending with the `Orchestrator outcome:` line.

Then read `make-it-work/<TICKET>-review.md`: record `review` from its `Orchestrator outcome:` line, and append the items under its `Context gaps (for final sync)` block to Context discoveries. A missing or unreadable outcome line is treated as `HUMAN_DECISION`, with the reason "review outcome unreadable".

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

---

## Completion

Set `status: Complete` and `phase: complete`, and log the transition. Then print a concise summary:

- **Implemented** — the plan's `## What This Changes`, in a sentence or two.
- **Validation** — from `execute`'s final report: steps completed and the completion-gate mode and result, or `gate: none` with the manual Test Plan walkthrough when the user chose to continue without an automated gate.
- **Known regressions** — each one, marked unrelated, stating plainly that they were documented, not fixed. Omit when there are none.
- **Review** — the verdict, how many review and fix cycles it took, and any Minor findings left unfixed.
- **Context updated** — every file changed by `close-the-gaps`, `plan-the-work`, and the final sync, or "none".
- **Replans used** — the count.

End with: "Changes are uncommitted — review the working tree and commit when ready."

---

## Rules

- Never commit anything, push, or open a PR.
- Never start on a detached HEAD. Never start on the base branch unless the user explicitly chose to proceed anyway at the branch guard.
- Never run `go-deep`, and never start a stage skill through the Skill tool.
- Never skip a checkpoint write, and never exceed a limit in the Transition table.
- Never answer a stage's question on the user's behalf, and never classify an uncertain regression without asking.
- Never fix a regression classified as unrelated.
- Never backfill `make-it-work/<TICKET>-status.html` for a run resumed with the file already missing — it is only ever created the first time a ticket's state file is created (Start → New run or Start → Pending offline refinement).
