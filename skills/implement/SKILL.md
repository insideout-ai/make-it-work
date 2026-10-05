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
autonomy: guided               # guided | autonomous | pending — pending only between state-file creation and Choose autonomy completing (see Start)
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

Alongside the state file, maintain a human-readable status page at `make-it-work/<TICKET>-status.html` — a static snapshot the user opens in a browser, not a live view. It is created once, the first time a ticket's state file is created (Start → New run, or Start → Pending offline refinement, whichever creates it first), immediately after that first write, then fully regenerated at every later checkpoint, per the Checkpoint rule above, from the fields that checkpoint just wrote. **Never backfilled** — a run already in progress when this feature ships, resumed with no status file, is not given one retroactively; it only appears for a ticket whose state file is first created after this feature exists.

Write it with exactly this template, filling in every bracketed placeholder from the state file's own fields at the moment of the write — introduce no field this file doesn't already track:

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title><TICKET> — implement status</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, sans-serif; width: 100%; margin: 0; padding: 1.5rem 2rem; color: #1a1a1a; }
  h1 { font-size: 1.4rem; margin: 0; }
  .pill { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 1rem; font-size: 0.85rem; background: #eee; margin-right: 0.3rem; }
  .pill[title] { cursor: help; border-bottom: 1px dotted #999; }
  table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; }
  th, td { text-align: left; border-bottom: 1px solid #ddd; padding: 0.3rem 0.5rem; font-size: 0.9rem; }
  .step-duration { color: #999; font-size: 0.8em; font-style: italic; white-space: nowrap; }
  .next-action { background: #fff6e0; border: 1px solid #e8d9a0; padding: 0.75rem 1rem; border-radius: 0.4rem; }
  .complete { background: #e6f4ea; border: 1px solid #b7dfc0; padding: 0.75rem 1rem; border-radius: 0.4rem; }
  .session-timing { font-size: 0.75rem; color: #888; }

  .header-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  .header-row .logo-plate { display: inline-flex; align-items: center; flex-shrink: 0; background: #1a1a1a; padding: 0.4rem 0.6rem; border-radius: 0.5rem; line-height: 0; }
  .header-row img { height: 56px; width: auto; display: block; }
  .header-row .autonomy-pill { margin-left: auto; flex-shrink: 0; }

  .phase-timeline { display: flex; align-items: flex-start; width: 100%; margin: 1.5rem 0 2rem; overflow-x: auto; overflow-y: visible; padding-top: 2rem; padding-bottom: 0.5rem; }
  .phase-step { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 90px; position: relative; }
  .phase-step .line { position: absolute; top: 14px; left: -50%; width: 100%; height: 3px; background: #d0d0d0; z-index: 0; }
  .phase-step:first-child .line { display: none; }
  .phase-step .line.line-green { background: #4caf50; }
  .phase-dot { width: 28px; height: 28px; border-radius: 50%; z-index: 1; border: 3px solid #d0d0d0; background: #fff; display: flex; align-items: center; justify-content: center; cursor: default; }
  .phase-dot.passed { background: #4caf50; border-color: #4caf50; color: #fff; }
  .phase-dot.failed { background: #e53935; border-color: #e53935; color: #fff; }
  .phase-dot.current { width: 56px; height: 56px; margin-top: -14px; background: #fff; border-color: #2196f3; box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.25); position: relative; }
  .phase-dot.current.spinning::after {
    content: ""; position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px;
    border-radius: 50%; border: 3px solid transparent; border-top-color: #2196f3; border-right-color: #2196f3;
    animation: phase-spin 0.9s linear infinite;
  }
  @keyframes phase-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .phase-dot.current.spinning::after { animation: none; }
  }
  .phase-label { margin-top: 0.4rem; font-size: 0.75rem; text-align: center; color: #555; max-width: 100px; }
  .phase-label.current-label { font-weight: 700; color: #1a1a1a; }
  .phase-mode { margin-top: 0.1rem; font-size: 0.62rem; color: #777; text-align: center; }
  .phase-activity { margin-top: 0.15rem; font-size: 0.68rem; color: #2196f3; text-align: center; max-width: 140px; font-style: italic; }
  .phase-duration { margin-top: 0.1rem; font-size: 0.65rem; color: #999; text-align: center; font-style: italic; }
  .phase-status { margin-top: 0.15rem; font-size: 0.68rem; font-weight: 600; text-align: center; }
  .phase-status.status-in-progress { color: #2196f3; }
  .phase-status.status-paused, .phase-status.status-stopped { color: #e65100; }
  .phase-status.status-complete { color: #2e7d32; }

  .artifact-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; max-width: 900px; }
  .artifact-tile { background: #f7f7f8; border: 1px solid #e2e2e4; border-radius: 0.4rem; padding: 0.6rem 0.75rem; min-width: 0; }
  .artifact-tile .label { font-size: 0.75rem; color: #777; text-transform: uppercase; letter-spacing: 0.03em; }
  .artifact-tile a { font-size: 0.85rem; word-break: break-all; }
  .artifact-tile .none { font-size: 0.9rem; color: #999; }

  @media (max-width: 900px) {
    .phase-timeline { overflow-x: scroll; }
    .phase-step { min-width: 80px; }
    .artifact-grid { grid-template-columns: 1fr; max-width: 100%; }
  }
</style>
</head>
<body>
<div class="header-row">
  <a class="logo-plate" href="https://insideoutai.io/make-it-work" target="_blank" rel="noopener noreferrer">
    <img src="data:image/png;base64,<LOGO_BASE64>" alt="InsideOut AI">
  </a>
  <h1>Make-It-Work: Implementation Workflow: <em><TICKET></em></h1>
  <span class="pill autonomy-pill" title="<AUTONOMY_TOOLTIP>">Autonomy: <AUTONOMY></span>
</div>

<div class="phase-timeline">
<PHASE_TIMELINE_STEPS>
</div>

<!-- only when status is Paused or Stopped -->
<p class="next-action"><strong>Waiting on you:</strong> <PAUSE_REASON></p>

<!-- only when status is Complete -->
<p class="complete"><strong>Run complete.</strong> <SESSION_DURATION_STATEMENT> Changes are uncommitted — review the working tree and commit when ready. This ticket's artifacts (spec/plan/execute/review/state/dashboard) are in <code>make-it-work/</code> and aren't committed — delete them yourself whenever you're done referencing this run.</p>

<h2>Artifacts</h2>
<div class="artifact-grid">
  <div class="artifact-tile"><div class="label">Spec</div><SPEC_LINK_OR_NONE></div>
  <div class="artifact-tile"><div class="label">Plan</div><PLAN_LINK_OR_NONE></div>
  <div class="artifact-tile"><div class="label">Execute</div><EXECUTE_REPORT_LINK_OR_NONE></div>
  <div class="artifact-tile"><div class="label">Review</div><REVIEW_LINK_OR_NONE></div>
</div>

<h2>Audit log</h2>
<table>
<tr><th>#</th><th>Time</th><th>From</th><th>To</th><th>Outcome / reason</th></tr>
<AUDIT_LOG_ROWS>
</table>
<!-- only when the Audit log has at least 2 rows -->
<p class="session-timing"><SESSION_TIMING_NOTE></p>

<h2>Cycle counters</h2>
<p>Review cycles: <REVIEW_CYCLE> / 4 &nbsp; Fix cycles: <FIX_CYCLE> / 3 &nbsp; Replans used: <REPLANS_USED> / 2</p>

<h2>Known regressions</h2>
<KNOWN_REGRESSIONS_LIST_OR_NONE>

<h2>Decided findings</h2>
<DECIDED_FINDINGS_LIST_OR_NONE>
<script>
  (function () {
    function pad(n) { return String(n).padStart(2, '0'); }
    function gmtLabel(date) {
      var offsetMin = -date.getTimezoneOffset();
      var sign = offsetMin >= 0 ? '+' : '-';
      var abs = Math.abs(offsetMin);
      return 'GMT' + sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
    }
    document.querySelectorAll('.ts').forEach(function (cell) {
      var raw = cell.getAttribute('data-ts');
      if (!raw) return;
      var d = new Date(raw);
      if (isNaN(d.getTime())) { cell.textContent = raw; return; }
      var datePart = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      var timePart = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      cell.textContent = datePart + ', ' + timePart + ' (' + gmtLabel(d) + ')';
    });
  })();
</script>
</body>
</html>
```

Filling in the bracketed placeholders:

- `<TICKET>`, `<AUTONOMY>`, `<REVIEW_CYCLE>`, `<FIX_CYCLE>`, `<REPLANS_USED>` — copied verbatim from the state file's field block.
- `<LOGO_BASE64>` — a fixed constant, never derived from the state file, and **never typed or reproduced by hand, even when copying it from this skill file's own earlier dashboard output**: a long opaque base64 blob is exactly the kind of content a model can silently corrupt while generating it as part of its own output (wrong character, dropped run, a plausible-looking but wrong substitution), and nothing about the HTML renders a warning when that happens — it just silently becomes a broken-image icon. Resolve `<base>` exactly as in Stage skills, then read the full payload from `<base>/assets/insideout-ai-logo-base64.txt` and splice it into the HTML mechanically — a shell command (e.g. `sed`, or a short Python/Node snippet reading one file and writing the other) that substitutes the literal file contents for the `<LOGO_BASE64>` token, never a Write/Edit tool call whose content you composed by hand. Do this every time this dashboard is created or regenerated, not just the first time.
- `<AUTONOMY_TOOLTIP>` — a fixed constant: `guided: pauses for your approval after the spec, after the plan, and at every human decision along the way. autonomous: no approval gates, and replans automatically when the plan stops holding — still asks every genuine question and still stops at loop limits and at completion.` — except while the state file's `autonomy` field reads `pending`, use instead: `not yet chosen — Context Check and/or Choose Autonomy are still running.` The `<AUTONOMY>` text shown in the pill itself needs no special-case — it already reads `pending` verbatim, per the existing "copied verbatim from the state file's own field block" rule.
- The "Waiting on you" paragraph (`<PAUSE_REASON>`) is included only when `status` is `Paused` or `Stopped`, using the state file's own `pause_reason` field verbatim. Omit this paragraph entirely for any other status.
- The "Run complete" banner is included only when `status` is `Complete`. Omit it for any other status.
- `<SPEC_LINK_OR_NONE>` / `<PLAN_LINK_OR_NONE>` / `<EXECUTE_REPORT_LINK_OR_NONE>` — an `<a href="...">` link to the file named in the state file's `spec` / `plan` / `execute_report` field, with that field's own `make-it-work/` prefix stripped from the `href` (e.g. `href="<TICKET>-spec.md"`); the link text may keep the field's full value. Print `<span class="none">Not yet created</span>` for any of these three whose state field still reads `none`.
- `<REVIEW_LINK_OR_NONE>` — once the state file's `review` field reads anything other than `not-started`, a link to `<TICKET>-review.md` (bare filename, same stripping rule as above); while `review` still reads `not-started`, print `<span class="none">Not yet created</span>` instead. If a replan resets `review` back to `not-started`, show `<span class="none">Not yet created</span>` again even if an older review file from a prior plan version is still on disk.
- `<KNOWN_REGRESSIONS_LIST_OR_NONE>` / `<DECIDED_FINDINGS_LIST_OR_NONE>` — an `<ul>` with one `<li>` per entry under the state file's `## Known regressions` / `## Decided findings` sections, or the literal text `<p>None</p>` when that section reads `None`.
- `<AUDIT_LOG_ROWS>` — one `<tr>` per row of the state file's own `## Audit log` table, in **reverse** order (newest first — the state file itself stays oldest-first/append-only; this reversal is a render-only transform, never applied to the state file). Each row's time cell is `<td class="ts" data-ts="<that row's ISO Time value>"></td>` (empty text content; the client-side script in the template fills it in). Each row's `Outcome / reason` cell is that column's text verbatim, followed by a duration span per these rules, using `real_rows_from` as the legacy-row boundary (a row's own `#` number, not its timestamp's format, decides whether it is legacy — a real ISO timestamp looks identical whether or not the clock reading behind it was genuine, so format alone can never tell the two apart): a row whose `#` is `< real_rows_from` gets no duration span at all; the row whose `#` equals `real_rows_from` gets ` <span class="step-duration" title="First row with a real captured timestamp — no real predecessor to measure from.">(first real timestamp)</span>`; every later row gets ` <span class="step-duration">(+<delta>)</span>`, where `<delta>` is that row's `Time` minus the immediately preceding row's `Time`, computed once via a shell `date` epoch-seconds subtraction at the moment this row is appended (never recomputed later, and never computed by reading two timestamps and subtracting mentally).
- `<SESSION_TIMING_NOTE>` — **Only rendered once the Audit log has at least 2 rows** (per the template's new conditional-paragraph comment) — a freshly created run's first dashboard (1 row) renders nothing here at all, since this cannot be done before this guard is well satisfied with a real second endpoint to span; there is no zero-duration fallback text, the paragraph is simply absent. Once there are ≥2 rows: one sentence, filled in at every checkpoint that extends the Audit log, reading: `Session timing: rows <real_rows_from>→<last row #> above span <total> of real captured time.` where `<total>` is the same kind of once-computed `date`-epoch delta between the `real_rows_from` row's `Time` and the last row's `Time`. When `real_rows_from > 1`, append: ` This is not the full session duration — everything before row <real_rows_from> happened before any real timestamp was captured.` When `real_rows_from = 1`, omit that sentence entirely — there is nothing to caveat. Always end with: ` Total session cost cannot be shown here either — no tool in this session surfaces token usage or $ cost back to the model (check /usage in your own client for that).`
- `<SESSION_DURATION_STATEMENT>` — banner-appropriate prose restating the same `<total>` figure already computed for `<SESSION_TIMING_NOTE>` in this same checkpoint — read that figure back from the note's own just-generated text rather than recomputing it independently, so the banner and the note can never disagree (do not paste the note's own sentence verbatim here — its "rows X→Y above" phrasing refers to the table above it, which doesn't make sense inside the banner). Matching the reference implementation's own banner pattern: `Real-timestamped portion of this run: <total>.` When `real_rows_from > 1`, append: ` (not the full session — see the Session timing note below).` When `real_rows_from = 1`, no parenthetical is needed. In the one defensive edge case where `<SESSION_TIMING_NOTE>` itself rendered nothing (fewer than 2 rows even at `status: Complete`), state instead, matching the exact wording the chat Completion summary already uses for its own analogous case (item 12): `Elapsed: unknown — no real start timestamp was captured for this run.`

**`<PHASE_TIMELINE_STEPS>`** — a sequence of `<div class="phase-step">...</div>` blocks. The timeline always starts from the 7 baseline phases, in this fixed order, each initially `not-reached` (grey) — **except** `context-check` on a dashboard created via Start's "New run" path, which starts as the **active** dot (`current`, spinning, since `status: In Progress` from the moment of creation — the dashboard now exists *before* Context Check runs, per item 20) and becomes `passed` once its own closing Audit-log row is logged, exactly like any other phase. A dashboard created via "Pending offline refinement" still starts every phase `not-reached` — that path never runs Context Check at all.

Baseline order and slot identifiers: `context-check`, `close-the-gaps`, `plan`, `execute`, `review`, `final-sync`, `complete` — 7 slots, with no reserved slot for `fix-plan`. `fix-plan` is still one of the 8 canonical identifiers (it has its own row in the mapping table below, and still matches rule 6's "none of the 8 canonical identifiers" check), but it earns its dot only on demand: it is spliced into the timeline the first time a `review → fix-plan` row actually appears in the Audit log, via the same insertion mechanism rule 2 uses for a genuine repeat-visit — never pre-rendered as a dead grey placeholder for a run that never needs it (see item 6).

Then walk the state file's own `## Audit log` table **top to bottom** (today's table is chronological oldest-first), maintaining a note of which baseline slots have been activated at least once, and which dot is currently "active" (starts as whichever slot is already `passed` per the rule above, if any — **except** for a New-run dashboard, where `context-check` itself starts as the **active** dot per that same rule, so there already *is* an active dot before the walk begins; for a Pending-offline-refinement dashboard, with nothing yet `passed`, there is indeed no active dot at the very start, exactly as before):

1. **Approval-gate rows are never dots.** A row whose `To` is `spec-approval` or `plan-approval` never starts anything — skip it. A row whose **`From`** is `spec-approval` or `plan-approval`, **and whose `From` differs from its `To`** (the row that actually records the approve/redo/stop decision) sets the **currently active dot's** `<div class="phase-mode">...</div>` annotation to that row's `Outcome / reason` text (e.g. "Approved as-is", "Redo requested") — this is the dot for `close-the-gaps` or `plan` respectively, which is still active at that point. A later approval decision for the same dot overwrites the earlier annotation; it is never appended.
2. **A row whose `To` is one of the 8 canonical identifiers, and differs from the currently active dot's own phase:**
   - **Fix-plan resumption (no new dot):** if `To` is `execute` and the currently active dot's phase is `fix-plan`, do not activate or insert anything — this is a fix-plan round resuming execution of its own added steps (per the Transition table's `fix-plan → execute` routing). The `fix-plan` dot simply stays active; this row's own `Outcome / reason` is history under that same dot, surfaced as the live step-progress annotation described in rule 4 below.
   - **`fix-plan`'s own first activation (no baseline slot to activate in place):** if this phase is `fix-plan` and it has never been activated before, it has no reserved grey slot — per item 6, `fix-plan` isn't part of the 7-slot baseline. Insert a brand-new `phase-step` for it immediately after the currently active dot, exactly like the Repeat-visit case below, and make the new dot active.
   - **First-ever visit to a baseline-slot phase:** if this canonical phase has never been activated before, and it is one of the 7 baseline slots (i.e. not `fix-plan`), activate its baseline slot *in place* (grey → real state, at its fixed position in the baseline order) and make it the active dot.
   - **Repeat visit (a real loop):** if this canonical phase was already activated earlier in the walk (e.g. `review` a second time after a fix-plan round, `fix-plan` a second time after a replan, or `plan` again after a replan), insert a brand-new `phase-step` for it immediately after the **currently active dot** (not necessarily the last baseline slot — e.g. inserting right after a `fix-plan` dot, well before the still-grey `final-sync`/`complete` slots), growing the timeline past its baseline length, and make the new dot active. Do not reuse or recolor the earlier dot for this phase — it keeps its own earlier annotation/state exactly as it was.
   - **Same phase as the active dot:** no new dot, no insertion — this row is just more history under the currently active dot (e.g. several `execute → execute` step-decision rows).
3. **Render every slot and every inserted dot, in final sequence order** (baseline slots in their fixed positions, with any inserted repeat-visit dots spliced in at the point they were inserted):
   - A connecting `<div class="line"></div>` immediately before the dot — omitted for the very first `phase-step`, given class `line-green` when the dot it precedes is `passed` or `current`.
   - `<div class="phase-dot <dot-state>" title="<internal-id>: <tooltip>"><symbol></div>` — `<internal-id>`/`<tooltip>` from the mapping table below; `<symbol>` is `✓` for `passed`, `✗` for `failed`, empty for `current` or `not-reached`.
   - `<div class="phase-label">...</div>` with the display label, followed by ` (<backing skill>)` from the mapping table below when that phase has one (add class `current-label` when this is the active/last dot and `status` is `In Progress`).
   - `<div class="phase-mode">...</div>` — rendered when step 1 above recorded an approval-gate annotation for this specific dot, **or** when the step-progress/round-history annotation rule below applies to it. These never both apply to the same dot: approval-gate annotations only ever land on `close-the-gaps`/`plan` dots, and step-progress annotations only ever land on `execute`/`fix-plan` dots.
   - **Only on the active/last dot, and only while `status: In Progress`**, also render `<div class="phase-activity">...</div>` with the state file's `current_activity` field verbatim, when it doesn't read `none` — the live "what's happening right now" sentence from Narration. Omit this div entirely when `current_activity` reads `none`, or when `status` is anything other than `In Progress` (per Narration's own clearing rules, it never holds a stale sentence while Paused/Stopped, but omit the div defensively here too).
   - **Only on the active/last dot**, also render `<div class="phase-status status-<status-slug>"><Status></div>`, where `<status-slug>` is the lowercased, hyphenated `status` value (`in-progress`, `paused`, `stopped`, `complete`) and `<Status>` is its display value.
4. **Step-progress and duration annotations:**
   - On the **active** `execute` dot: render `<div class="phase-mode">` with the plan file's own `## Execution Status` block, read fresh at the moment of this regeneration — `<Mode> · Step <N> of <M> complete`.
   - On the **active** `fix-plan` dot: if the state file's `fix_plan_round_steps` currently reads `none` (this round's own entry row has been logged, but amend-mode planning hasn't yet determined how many steps it adds — see the Execute/Fix-plan phase changes), render **no** `<div class="phase-mode">` for it at all yet; the annotation first appears once that round's size-decision row has been logged and the dashboard regenerated again. Once `fix_plan_round_steps` holds a real count: render `<div class="phase-mode">` with the same `<Mode> · Step <N> of <M> complete` text, but with `<N>`/`<M>` replaced by the *local* count within this round: `<N> − (<M> − fix_plan_round_steps)` out of `fix_plan_round_steps` (both from the state file's own `fix_plan_round_steps` field and the plan's live Progress line).
   - On a **non-active, already-`passed`** `fix-plan` dot: render the same `<div class="phase-mode">` using that specific round's own step count, read back from the Audit-log decision row that recorded it (`Fix-plan round <N>: added <Y> steps covering <F> findings` — see the Execute/Fix-plan phase changes). Associate each such dot with its own round's decision row by **walk-position** — the decision row logged immediately after that specific dot's own activation in this same walk — never by matching the row's round-number text, which can repeat across plan versions after a replan resets `fix_cycle` to 0. Never read this annotation from the live `fix_plan_round_steps` field, which only ever reflects the *current* round.
   - On every dot whose state is `passed` (completed, not active), **except the terminal `complete` dot**: render `<div class="phase-duration">` with the delta between the Audit-log row that activated this dot and the row that activated the *next dot that actually gets activated* in final sequence order — skipping over any baseline slot that stays `not-reached` in between (e.g. a `plan`-approval redo loop that never actually repeats `plan` leaves intervening baseline slots `not-reached`, so a completed dot's duration is measured to whichever later dot actually activated next). On a clean single-pass run with no fix-plan round, Review's exit row transitions directly to the row that activates `final-sync` — since item 6 means `fix-plan` was never spliced into the timeline at all for this run, there is no slot to skip over here; the two dots are simply adjacent in the final rendered sequence, exactly as they would be on any other clean run. The transition-out row of one dot is the same row as the transition-in row of the next counted dot; compute the delta once via `date` epoch subtraction at the moment the *later* of those two rows was appended. If either endpoint's row `#` is `< real_rows_from`, render `—` instead of a computed value. The terminal `complete` dot never renders this div at all, passed or otherwise — it marks the run's endpoint rather than a phase with a duration of its own, and has no "next dot" to measure to (matching the reference implementation, whose own Complete dot carries no duration). Never render this div for a `current` or `not-reached` dot either.
5. **Dot state:** every already-activated dot before the active/last one is `passed`. A baseline slot never activated is `not-reached`. The active/last dot's state comes from the run's `status`:
   - `Complete` → `passed` (never `current` — the terminal dot must never look like it's still running).
   - `In Progress` → `current spinning` (both classes).
   - `Paused` → `current` only, without `spinning` (enlarged, but static — nothing is actively executing while paused).
   - `Stopped` → `failed`.
6. **A `To` value that matches none of the 8 canonical identifiers and isn't `spec-approval`/`plan-approval`** never starts, activates, or inserts a dot — skip that row for timeline purposes (it still appears verbatim in the Audit log table itself).

**Worked example** (traced against the reference implementation's own real run, confirming this produces its exact 9-dot shape): `start→close-the-gaps`, `close-the-gaps→spec-approval`, `spec-approval→plan` ("User approved spec as-is"), `plan→plan-approval`, `plan-approval→execute` ("User approved plan as-is"), six `execute→execute` rows, `execute→review`, `review→review` (cycle 1), `review→fix-plan` ("added 6 steps"), five `fix-plan→fix-plan` rows, `execute→execute` ("all 12 fix-plan steps complete" — **fix-plan resumption, folds into Fix Plan, no new dot**), `execute→review` ("gate re-run PASSED"), `review→review` (cycle 2 — **repeat visit, inserted dot**), `review→final-sync`, `final-sync→complete` — yields, in order: Context Check (passed), Refinement (passed, "Approved as-is"), Plan (passed, "Approved as-is"), Execute (passed), Review (passed, cycle-1 history), Fix Plan (passed, includes the resumed-execute history), Review (inserted, cycle-2 history — this is the active dot, so it also carries the `<phase-status>` line), Final Sync (passed), Complete (passed, terminal, since `status: Complete`) — 9 dots, matching the reference exactly.

**Internal identifier → display label / backing skill / tooltip mapping** (use exactly this wording in every dashboard, so it stays consistent across tickets). The **Backing skill** column names the stage skill actually doing the work for that phase (see Stage skills) — when it's not empty, append it to the label in parentheses, e.g. `Plan (plan-the-work)`; when empty (no stage skill backs this phase — it's orchestrator-only logic), the label carries no parenthetical at all:

| Internal identifier | Display label | Backing skill | Tooltip text (after `<identifier>: `) |
| --- | --- | --- | --- |
| `context-check` | Context Check | *(none)* | verifies the project already has the context (skills, rules) this pipeline needs before starting. |
| `close-the-gaps` | Refinement | `close-the-gaps` | refines the request into a reviewed, gap-checked spec via Q&amp;A, ending in a spec-approval checkpoint. |
| `plan` | Plan | `plan-the-work` | turns the approved spec into a concrete, testable implementation plan, ending in a plan-approval checkpoint. |
| `execute` | Execute | `execute` | implements the plan step by step, writing and passing each step's tests. |
| `review` | Review | `review-the-pr` | an independent pass reviews the implemented change for correctness and quality. |
| `fix-plan` | Fix Plan | `plan-the-work` | turns review or gate findings into new plan steps to implement. |
| `final-sync` | Final Sync | *(none)* | updates the project's skills/docs to reflect what was actually built. |
| `complete` | Complete | *(none)* | the run has finished successfully. |

**Logging a decision row:** whenever an `AskUserQuestion` resolution represents a consequential in-run decision that is *not itself a phase change* (a phase change already produces its own ordinary row — never double-logged as a decision row too), append an Audit-log row with `From` and `To` both equal to the current phase, and an `Outcome / reason` starting with `Decision: ` (matching the reference implementation's own wording, e.g. `Decision: Execution mode selected — Subagent-Driven (Recommended)`). Examples: the autonomy-level choice (Start), the execution-mode choice and the inline-pause-mode choice (Execute), a fix-plan round's added-step count (Fix plan) — and, in the future, item 8's Sequential-vs-Parallel dispatch choice, with no further change needed here.

Mention the file's path once, in whichever of Start's two creation points actually creates the state file first for this ticket (New run's own creation point, in the very first chat message of the run — before Context Check or Choose Autonomy even run; or Pending offline refinement's stop message) — never repeated at later checkpoints, and never shown at all for a Resume (per the no-backfill rule above).

---

## Narration

Before any stretch of work that involves several tool calls with no natural pause point in between — reading multiple files to investigate something, writing and running a batch of tests, applying a fix and re-verifying it — say one plain sentence describing the high-level activity about to happen, then proceed without further narration until that chunk's natural conclusion. Not a sentence per tool call, and not a sentence per tiny sub-step — just enough that the user always knows what's currently happening without having to infer it from a string of tool calls.

Each such sentence also updates the state file's `current_activity` field and regenerates the dashboard (per the Checkpoint rule), so the same "what's happening right now" signal is visible to someone reading the dashboard async, not only someone reading live chat:

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
   - **Current branch equals `base`** → compute a suggested branch name: `<TICKET>`; if `git rev-parse --verify --quiet refs/heads/<TICKET>` resolves (the name is already taken), try `<TICKET>-2`, `<TICKET>-3`, … incrementing until one does not resolve, and use that instead. Then ask with `AskUserQuestion`: *"You're on `<base>` — proceed anyway, or should I create a feature branch for you?"*, with these options:
     - Create feature branch `<suggested-name>` (recommended).
     - Proceed on `<base>` anyway.
     - Stop.

     If the user picks **Create feature branch**, confirm the exact name before creating anything: tell them "I'll create and switch to `<suggested-name>` — reply to confirm, or give a different branch name," and wait for their reply. Use whatever name they confirm or supply as `<final-name>`, then run `git switch -c <final-name>`. If that command fails (e.g. the name turned out to be taken after all), show the error and ask again for a different name — never silently retry with a guessed alternative. Once the branch is created, continue to the next Start check.

     If the user picks **Proceed on `<base>` anyway**, continue to the next Start check without creating a branch.

     If the user picks **Stop**, stop here, exactly as today's hard stop did.
   - **Neither condition applies** → continue to the next Start check.
2. **Completed run** — a state file exists with `status: Complete`, **or** with `status: Stopped` and `phase: context-check` → ask whether to start a new run (the state file is overwritten) or stop. A run that never got past Context Check produced no artifacts worth resuming, so it is treated the same as a completed run's own re-run prompt, not routed into Resume.
3. **Run in progress** — a state file exists with any other status → go to **Resume**.
4. **Pending offline refinement** — `make-it-work/<TICKET>-questions.md` exists with `**Status:** Awaiting Answers` → create the state file with `phase: close-the-gaps`, `status: Paused`, `pause_reason: offline refinement pending`, a real captured timestamp in `start_time` (same capture rule as the Checkpoint rule's `Time` cell), and the progress dashboard (`make-it-work/<TICKET>-status.html` — see Progress dashboard below), mentioning the dashboard's path once in this stop message; tell the user to finish `/make-it-work:close-the-gaps <that path>` and then run `implement` again; stop.
5. **New run**:
   - Capture a real timestamp into `start_time` (same capture rule as the Checkpoint rule's `Time` cell).
   - Create the state file with `phase: context-check`, `status: In Progress`, `autonomy: pending`, every other field at its template default (including `real_rows_from: 1`), and log the first Audit-log row: `From: start`, `To: context-check`, with an `Outcome / reason` summarizing whatever the branch guard just resolved (e.g. `New run created; branch <name> created per branch-guard choice` or `New run created; proceeding on <base>` — fold the branch-guard outcome into this one row's narrative; no separate row for it, since no state file existed while the branch guard ran).
   - Create the progress dashboard (`make-it-work/<TICKET>-status.html` — see Progress dashboard below) from those fields, and tell the user its path in the very first chat message of the run.
   - *Only then* run **Context check**. **If its outcome is "stop"** (no signal at all, or incomplete, per Context check's own Outcomes), set `status: Stopped` explicitly — not `Paused`: there is no mid-run point to resume into until the user has run `go-deep` externally and re-invokes `implement`, which is effectively a fresh attempt, not a resumable pause. Log this as the phase's own Audit-log row (`From`=`To`=`context-check`, `Outcome / reason`: the exact stop message shown to the user), regenerate the dashboard, then stop exactly as Context check's own Outcomes already specify.
   - If Context check succeeds, run **Choose autonomy** — when autonomy is chosen, update the `autonomy` field from `pending` to the chosen value, log a decision row (`From`/`To` both `context-check`) reading `Decision: Autonomy level selected — <Guided|Autonomous>`, and regenerate the dashboard (per the Checkpoint rule).
   - Then, exactly as today: if `make-it-work/<TICKET>-spec.md` and/or `make-it-work/<TICKET>-plan.md` already exist from standalone runs, show what was found and ask: reuse them and start at the next phase, or redo from that phase.
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

Ask once, with a single `AskUserQuestion`, and save the answer to `autonomy`:

- **Guided (Recommended)** — pauses for approval after the spec and after the plan, and for every human decision.
- **Autonomous** — no approval gates, and replans automatically when the plan stops holding. It still asks every question a stage asks and every uncertain regression, and it stops at the loop limits and at completion.

Offer only these two levels.

---

## Resume

Compare the current `branch`, `head`, `worktree_fingerprint`, `spec_hash`, and `plan_hash` against the state file.

- **Nothing changed, and the last log row closed its phase** (the last Audit-log row's `From` differs from its `To` — a trailing same-phase decision row, per the merged-log design, never counts as closing a phase) → show one line (current phase and autonomy level), offer to change the autonomy level, then continue at `phase`. This bucket never applies while `phase: context-check`, even when its one logged row (`start → context-check`) technically has `From ≠ To` — that row only records *entering* Context Check, and Context Check's own mandatory follow-on orchestration (Choose autonomy, the reuse/redo prompt, the closing row) may not have run yet; a `phase: context-check` state always falls to the next bucket instead.
- **Interrupted mid-`context-check`, mid-`close-the-gaps`, mid-`review`, or mid-`final-sync`, with nothing else changed** → these phases are safe to repeat: tell the user, then re-run that phase from its start. For `context-check` specifically, "from its start" means re-entering Start check #5 at its "run Context check" bullet and continuing through it exactly as a New run would — Choose autonomy (re-asking if `autonomy` is still `pending`), the reuse/redo prompt, and the explicit closing row/phase-update — since that orchestration lives in Start, not in a `## Phases` subsection of its own.
- **Anything changed, or the run was interrupted mid-`plan`, mid-`fix-plan`, or mid-`execute`** (the phase started but has no closing log row) → list exactly what differs, then ask:
  - **Resume anyway** — re-record the fingerprints and continue. For an interrupted execute, run `execute` again; it resumes from its own Progress line.
  - **Redo the affected phase** — the earliest phase whose artifact changed; code changed outside the workflow → execute.
  - **Start over** — a new run for this ticket.

Ask this in both autonomy levels. Never assume a changed repository is still safe to resume.

**Legacy-schema migration:** before applying any of the three outcomes above, check whether the state file's raw field block is missing the `real_rows_from` key entirely (it predates this feature). If so, add it — along with any other field-block key introduced by this feature or an earlier one that the file is missing, each at its template default — and set `real_rows_from` to one more than the state file's current Audit-log row count at this moment (every row already logged is legacy; every row logged from here on is real). This is the only migration Resume performs; it never touches a file that already has the key.

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

Set `execution: running`, then follow `execute` inline with the plan path and the autonomy level. Whenever the next not-yet-done step's own number is greater than `M − fix_plan_round_steps` (i.e. it belongs to the current fix-plan round's own added steps, not the original plan) — a plain comparison against numbers already in the state file, so this stays correct across an interrupted-and-resumed execute within the same round without depending on which Transition-table row most recently fired — also pass `fix_plan_dispatch`'s current value (`sequential` or `parallel`) as an additional input to `execute`. For the original plan's own steps (resume point at or below that boundary), never pass this input at all. While following it inline, after every per-step checkpoint it performs — under Subagent-Driven mode, the point where this session reviews a step's report and re-reads `## Execution Status → Progress` before dispatching the next step (`execute/SKILL.md`'s Phase 2 "reviewed between steps" pause point); under Inline mode, the point right after a step's own Progress-line update (`execute/SKILL.md`'s Phase 2 point 4) — also regenerate the dashboard immediately, before continuing to the next step, using the plan file's current `## Execution Status` Mode/Progress lines. Do not wait for the whole Execute phase to finish before the first of these regenerations. Also, when execution_mode or inline_pause_mode is first chosen for this plan version, record it in the state file's `execution_mode`/`inline_pause_mode` fields and log a decision row for it (per the decision-row-logging paragraph above) before the first per-step dispatch. Read its outcome lines:

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

Follow `plan-the-work` inline in amend mode, with one fix source: the review report (plus the user's decisions on any `Route: human` findings), or `execute_report` (which holds the gate report and the related failing tests). At the moment the `review → fix-plan` row is logged (this round's entry, before its actual step count is known), reset both `fix_plan_round_steps` and `fix_plan_dispatch` to `none` and regenerate the dashboard — the new Fix Plan dot renders active with no step-progress annotation yet (per the Progress dashboard section's own guard for this case). Once amend-mode planning determines this round adds `Y` new steps, record `fix_plan_round_steps: Y` in the state file, and log it as a decision row (per the decision-row-logging paragraph above) immediately after that same entry row: `Decision: Fix-plan round <N>: added <Y> steps covering <F> findings` (where `<N>` is this run's count of fix-plan rounds so far, i.e. `fix_cycle` after this round's own increment, and `<F>` is the count of findings this round addresses), then regenerate the dashboard again — this is what makes the step-progress annotation first appear.

At this same point, resolve `fix_plan_dispatch` on exactly one of these three paths, never leaving it at its reset `none`:

- **`execution_mode` does not read `subagent-driven`** (e.g. Inline): record `fix_plan_dispatch: sequential` directly — there is no concurrency primitive to offer a choice about, and this round's own added steps dispatch exactly like the original plan's always have.
- **`execution_mode` reads `subagent-driven`, but none of this round's newly-added steps carries a `**Can run in parallel with:**` marker naming another step within this same round**: record `fix_plan_dispatch: sequential` directly — there is nothing to choose between.
- **`execution_mode` reads `subagent-driven`, and at least one added step does carry such a marker:** ask, using the same `AskUserQuestion`-gated-by-autonomy-level pattern already used elsewhere in this skill (e.g. Choose Autonomy, the branch guard): in Guided, ask with `AskUserQuestion` (`multiSelect: false`): *"Dispatch this round's steps sequentially, or in parallel where the plan's own markers allow it?"*, with options `{ label: "Sequential (Recommended)", description: "One step at a time, exactly like today." }` and `{ label: "Parallel", description: "Dispatch genuinely independent steps' subagents at the same time, where the plan's own markers and file ranges allow it." }`; in Autonomous, do not ask — record `sequential`, the recommended option, directly. Record the chosen value in `fix_plan_dispatch` (`sequential` or `parallel`).

Only the third path (an actual question asked, or actually auto-resolved from a real choice) gets a decision row — the first two paths are not a decision, since nothing was actually being chosen between. For the third path, log a decision row (per the decision-row-logging paragraph above): `Decision: Fix-plan round <N> dispatch order: Sequential` or `Decision: Fix-plan round <N> dispatch order: Parallel`. Regenerate the dashboard after resolving `fix_plan_dispatch` on any of the three paths.

A round that adds no steps (every finding accepted as-is) does not set or log this — it already doesn't count against `fix_cycle` per the existing rule below. Do not add the mid-phase dashboard-regeneration instruction from `### Execute` to this phase section — `### Fix plan` covers only the planning sub-phase (drafting and sizing the round's new steps), which has no per-step loop of its own; the added steps' own per-step execution happens under `### Execute`, once routed there per `fix-plan → execute`, where that same mid-phase dashboard-regeneration instruction already applies. Afterwards record `plan_hash`, and re-record `head` and `worktree_fingerprint`. Increment `fix_cycle` only if steps were added — a round that adds none (every finding was accepted as-is) does not count against the limit. Then follow the Transition table: added steps → Execute (it resumes at the first added step); no steps → Review.

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
| review | `review_cycle = 4` and not `CLEAN` | stop (review limit reached) | stop (review limit reached) |
| review | `CLEAN` | final-sync | final-sync |
| review | `FIX_REQUIRED`, `fix_cycle < 3` | fix-plan (review) | fix-plan (review) |
| review | `FIX_REQUIRED`, `fix_cycle = 3` | stop (limit reached) | stop (limit reached) |
| review | `REPLAN_REQUIRED` | first ask about any `Route: human` findings (record under Decided findings); then replan if `replans_used < 2`, else stop | same as Guided |
| review | `HUMAN_DECISION` | ask about each `Route: human` finding and record each decision under Decided findings; then fix-plan (review) with the answers — `fix_cycle` limit applies | same as Guided |
| fix-plan | steps added | execute | execute |
| fix-plan | no steps added (every finding accepted as-is) | review | review |
| final-sync | done | complete | complete |

**Replan** — `replans_used += 1`; `plan_version += 1`; `review_cycle = 0`; `fix_cycle = 0`; `fix_plan_dispatch` back to `none`; `execution` and `review` back to `not-started`; then Plan in replan mode, passing the previous plan path, one feedback path — `execute_report` after an execute stop, or the review report after `REPLAN_REQUIRED` (whose `Route: fix` findings are constraints for the new plan too) — and the Decided findings list, every entry of which is also a constraint. In Guided the new plan goes through plan approval again, and `execute` will ask for the execution mode again, since each new plan version starts with it unchosen.

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
- **Elapsed** — if `start_time` is a real captured timestamp (not `none`), the plain delta between it and this transition's own just-logged timestamp, as a human-readable duration (e.g. "2h 14m") — convert both ISO timestamps to epoch seconds via the host's `date` utility and subtract; this is a duration, not a display timestamp, so no timezone conversion is needed. If `start_time` is `none` (this run began before real start-timestamp capture existed), state "Elapsed: unknown — no real start timestamp was captured for this run" instead of estimating or backfilling one.
- **Cost** — not shown; no tool surfaces token-usage or billing data to this session. Check your own client's `/usage` command instead.

End with: "Changes are uncommitted — review the working tree and commit when ready." then, on its own line: "This ticket's artifacts (spec/plan/execute/review/state/dashboard) are in `make-it-work/` and aren't committed — delete them yourself whenever you're done referencing this run." This is a plain reminder, not a question — never ask for confirmation, and never delete anything.

---

## Rules

- Never commit anything, push, or open a PR.
- Never start on a detached HEAD. Never start on the base branch unless the user explicitly chose to proceed anyway at the branch guard.
- Never run `go-deep`, and never start a stage skill through the Skill tool.
- Never skip a checkpoint write, and never exceed a limit in the Transition table.
- Never answer a stage's question on the user's behalf, and never classify an uncertain regression without asking.
- Never fix a regression classified as unrelated.
- Never backfill `make-it-work/<TICKET>-status.html` for a run resumed with the file already missing — it is only ever created the first time a ticket's state file is created (Start → New run or Start → Pending offline refinement).
- Never fabricate or estimate a timestamp, a cost figure, or a duration computed from a missing real anchor — state plainly when a figure isn't knowable instead.
- Every duration or delta shown anywhere — per-row audit-log deltas, phase durations, the Session timing note, the completion banner — is computed exactly once, at write time, via an actual shell `date` epoch-seconds subtraction between two real captured timestamps; never by mental arithmetic, and never deferred to client-side JavaScript (client-side JS is used only to convert a single absolute timestamp into the viewer's local display time).
- Default any open-ended investigation or multi-file/multi-repo exploration this skill performs directly — not already delegated to a stage skill's own instructions — to a fresh subagent dispatch (Agent tool), the same way Review dispatch and per-step Execute already do; work from the returned report rather than accumulating the raw investigation inline. Final context sync's own diff/documentation-impact analysis is the clearest example of this: when the change diff is large or several candidate skills/docs need evaluating, fork that analysis out instead of reading everything in this session.
- Never let a write to the state file's `## Known regressions` or `## Decided findings` sections, or to its `current_activity` field, wait for the next phase checkpoint to reach the dashboard — regenerate it immediately after that write, wherever it happens (e.g. Gate triage appending an unrelated regression; a review outcome recording a Decided finding; a Narration sentence being said), per the Checkpoint rule's own regeneration step.
