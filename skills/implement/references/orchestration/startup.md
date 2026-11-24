
# Implement

**Role:** Act as a thin orchestrator for the make-it-work pipeline.

**Goal:** Take one ticket from request to a reviewed, context-synced implementation by running the existing stage skills in order. `implement` assesses the ticket's risk to choose the run mode, decides which phase runs next, runs that stage skill, interprets the outcome it reports, records the transition, enforces the loop limits, and performs the final context sync. It never redoes a stage's own reasoning — refinement belongs to `close-the-gaps`, planning to `plan-the-work`, test preparation to a fresh `write-the-tests` worker, implementation to `execute` (or, in Lightweight mode, a dispatched implementation subagent), review to `review-the-code`.

**Autonomy changes:** Before Start or Resume, read [references/autonomy-changes.md](../autonomy-changes.md). Keep this contract active during inline stages: chat changes queue for the next phase, while the saved effective mode governs the current phase.

**Ticket updates:** For an explicitly supplied tracker ticket or a run with a saved `ticket_publication` journal, read [references/ticket-publication.md](../ticket-publication.md) at Start/Resume and keep it active through the run. `implement` alone publishes accepted specs, plans (attachments or authorized comment fallback), significant blockers, completion/review/verification summaries and one final Jira HTML dashboard attachment through available connector capabilities, under a separately saved, explicit consent. Autonomy never grants ticket-write permission. Local spec/pasted-content runs stay local unless the user explicitly supplies a tracker destination.

## Load only the applicable startup route

Read this shared routing guide and the standing rules on every Start/Resume.
Resolve managed-session discovery and existing state using the routing below before loading a route:

- Existing run: read [Resume](resume.md), retaining saved roots, pending input and approvals. Do not load fresh-start procedures unless the user selects a fresh run.
- Fresh run: read [fresh startup](startup-fresh.md) in full before initialization, early context precheck, autonomy/destination questions or branch actions.
- Re-entering Context check: read fresh startup's Context check section and applicable linked contracts; this does not authorize creating a new run.

## Autopilot mode

While the current autonomy is `autopilot`, construct every later ordinary implementation question/checkpoint payload exactly as the interactive path would, but do not call `AskUserQuestion` or wait during implementation. `--autopilot` and Start's autonomy question select the initial mode; a later explicit chat request follows **Change autonomy during a run** below. Requirements-conflict resolution and revised-spec approval also require explicit user input in Autopilot; see **Requirements conflict — return to refinement**. Workspace repository/branch selection is a separate mandatory explicit approval, including Autopilot; see [workspace.md](../workspace.md). Completion's optional delivery offer happens only after the run is terminal and is always asked, including in Autopilot. Append each orchestration-level resolution with the shared schema in `docs/autopilot-log-schema.md`. When `--autopilot` is supplied and `<TICKET>` is known, initialize `make-it-work/<TICKET>/implement-autopilot-log.jsonl` fresh before Start's existing-run check, so a hard stop there can still be logged, unless an explicit mode-change request in this message overrides the flag; that request uses the reference's log-preservation rule. When Autopilot is selected interactively for a new run, initialize it immediately after that choice, before the branch guard. Log the autonomy selection as the first resolution in either case; the rationale must distinguish a user's selection from a flag-selected default. Use `node "<base>/../../scripts/decision-log.mjs" init|append implement --root "<repo-root>" --ticket "<TICKET>"` in its own Bash call when Bash is available; a denied log write never blocks unrelated pipeline work.

Auto-resolve only these safe defaults: apply the assessed (or forced) run mode and any escalation; create the suggested ticket-named feature branch when starting on the base branch; retain a clean resumable autopilot run's saved mode; resolve testing readiness before planning (missing strategy: use existing automation or default to manual when tooling is absent; existing strategy: retain its setup flow); continue with clear related/unrelated regression classification; choose sequential dispatch; and replan when the existing Autonomous rules already prescribe replan. Honor an explicitly selected manual verification policy without asking again; never infer it from unavailable automated results. Forward `--autopilot` to `close-the-gaps`, `define-test-strategy` during readiness, `plan-the-work`, `execute`, and the Review dispatch; `execute` forwards it to `run-regression` for its automated completion gate.

Stop, record `chosen: null`, set `status: Stopped`, clear `current_activity`, regenerate the dashboard, and report the remediation when there is no safe default: no ticket or several resumable runs, detached HEAD, an existing completed/stopped run or standalone artifacts that would need a reuse/overwrite choice, changed worktree on resume, plan blockers, uncertain regression ownership, an unavailable regression result, a review `Route: human` finding, or any stage's own hard stop. A saved refinement draft with in-scope TBDs instead stays Paused in close-the-gaps under the refinement guide, including in Autopilot. A normal terminal feedback retrospective never re-opens a successful run: write the best available share-safe diagnosis and retain material uncertainty in `openQuestions` rather than asking follow-ups.

At the terminal report, summarize auto-resolved decisions and the implement log path in addition to the normal completion/stop summary.

## Change autonomy during a run

Follow the mandatory [autonomy-change contract](../autonomy-changes.md) for chat requests: queue the new mode for the next phase, preserve the current phase's effective policy and pending approvals, and refresh an existing dashboard before acknowledging the queue.

---

## Start

**Workspace routing comes first:** read [references/workspace.md](../workspace.md) before resolving a current branch or running the checks below. Resolve layout and artifact root with the shared helper. A workspace needs no root `CLAUDE.md` or `.git`. For workspace runs, run `find-the-repos` inline, preview the exact repositories and branch actions, and obtain explicit user approval in **every** autonomy mode before creating or switching branches. Present the prepared preview dashboard as a clickable Markdown link, `[Review repository and branch selection](<returned HTML path>)`, alongside the exact selection; a path in backticks does not satisfy sharing the HTML link. Run the early context precheck on the selected repositories before applying those branch actions. Then use the per-repository branch helper instead of the single-repo branch guard below. An existing workspace run resumes its saved contract before any new discovery or branch changes.

For a fresh run, follow [session worktrees](../session-worktrees.md) for checkout
selection and `--worktree`/`--continue-here`. Check managed session discovery
before creating another run. An isolated candidate keeps preflight artifacts in
its private root while assessment reads the sources; its exact worktree actions
use the existing repository/branch approval. The current-checkout route keeps this guide's
current-checkout flow. Existing private runs resume their bound roots directly.

Resolve the ticket, current branch, base branch, and any existing state file before these checks. Work through them in order. A new run chooses autonomy before creating a branch; an existing run keeps its saved autonomy and goes through Resume before any branch change.

If this message explicitly requests a mode change, apply **Change autonomy during a run** before any saved-Autopilot or flag-mismatch shortcut below. Keep all branch/workspace comparisons and existing-run checks; a mode change does not approve Resume anyway, Redo, or Start over.

1. **Detached `HEAD`** → stop: tell the user to create or switch to a feature branch first. A run must never start on a detached HEAD — there is no branch for the work this run produces to live on.
2. **Existing run** — a state file exists:
   - `status: Complete` with an explicit request to sync/reconcile/retry **ticket updates for this completed run** → use the publication reference's completed-run path only. Preserve Complete, its artifacts and consent; do not start a new implementation, repeat stages or re-offer delivery. Report actual publication results and finish.
   - `status: Complete` with an explicit response to its saved delivery offer, or a request to continue its already opted-in preparation → follow Completion's delivery-response handling and inline `deliver` continuation below. Preserve Complete and its package; do not offer a new implementation or repeat the delivery opt-in question. A previously recorded opt-in is not exact-plan approval.
   - `status: Complete`, or `status: Stopped` with `phase: context-check` → ask whether to start a new run (the state file is overwritten) or stop. Under `--autopilot`, stop rather than overwriting the state or artifacts. A run that never got past Context Check produced no artifacts worth resuming. Only if the user chooses a new run, continue to Choose autonomy below.
   - Any other status → go to **Resume**. Do not ask for a fresh autonomy choice or create a branch before comparing the saved branch and workspace fingerprints.
