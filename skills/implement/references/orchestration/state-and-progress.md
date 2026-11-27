## Workflow state

**Scripted checkpoints:** Read [references/controller.md](../controller.md) before Start. New runs are initialized and transitioned by `scripts/workflow.mjs`; its `controller_version: 1` contract replaces manual state/counter/hash/audit writes described below. New initialization reads `assets/workflow-defaults.json`; the annotated template below remains the legacy/manual reference. Existing runs without the field retain their original behavior.

**Waiting for input:** Once state exists, read the reference's pending-input lifecycle before any user question or approval. Blocking waits are persisted as Paused with their actual question/choices, cleared activity and refreshed HTML before asking. Resolve the saved ID explicitly before continuing; optional permission requests can remain nonblocking. Delivery after Complete retains its separate journal. This replaces ad hoc question/pause bookkeeping below.

For a new run, create the real directory `make-it-work/<TICKET>/` under the artifact root and put all ticket-scoped artifacts there. Keep the existing `<TICKET>-` filenames inside that directory. Do not move or resume flat artifacts from older runs. The run's state lives in `make-it-work/<TICKET>/<TICKET>-state.md`, next to the other pipeline artifacts. Create it with exactly this template:

````markdown
# Workflow state — <TICKET>

```
ticket: <TICKET>
handoff_version: 1
test_writing_version: 1
test_coverage_version: 1      # fresh TDD plans require purpose and regression-impact metadata; no legacy backfill
test_preparation: none
test_preparation_report: none
review_scope_version: 1       # full delivery diff required for clean review and packaging             # new runs use validated JSON handoffs; absent on older runs
review_context_version: 2     # prepare known context and evidenced test-map assessment; new runs only
review_checks_version: 1      # required skill/rule and mapping assessment evidence; new runs only
feedback_evidence_version: 1  # numbered source packet and inspection coverage; new runs only
status: In Progress            # In Progress | Paused | Stopped | Complete
phase: context-check           # context-check | close-the-gaps | spec-approval | plan | plan-approval | write-tests | execute | lightweight | review | fix-plan | final-sync | final-approval | complete
change_assessment_version: 1   # informational assessment after final sync; new runs only
final_package_version: 1       # new runs build a content-bound final package; absent on older runs
acceptance_evidence_version: 1 # new TDD runs map requirement clauses to assertions/observations
verification_version: 1        # new runs persist per-step and AC evidence; absent on older runs
adaptive_version: 1            # new runs assess risk and choose a run mode; absent on older runs, which carry none of the fields through implementation_report below
risk: none                     # none | low | medium | high — none until assessed
mode: none                     # none | lightweight | tdd — low → lightweight; medium/high → tdd
mode_source: none              # none | assessed | user — user = forced by flag, chat, or spec-approval override
risk_rationale: none           # one line: the factors that drove the assessment, plus any override/disagreement note
escalations: 0                 # Lightweight → TDD escalations (limit 1)
implementation_report: none    # make-it-work/<TICKET>/<TICKET>-lightweight.md once Lightweight implementation ran
autonomy: guided               # effective mode for the current phase: guided | autonomous | autopilot; legacy runs may have pending
queued_autonomy: none          # none | guided | autonomous | autopilot; applies only at the next phase transition
refinement_destination: none    # none | here | slack-draft | slack-send; separate from autonomy and ticket updates
start_time: none                # ISO 8601 UTC timestamp captured when the state file is first created; never fabricated or backfilled
plugin_version: none            # exact version from this plugin's .claude-plugin/plugin.json, captured once at Start; never changed or backfilled
execution_mode: none            # none | subagent-driven | inline — set once execute's Mode-selection phase runs
inline_pause_mode: none         # none | stop-after-each-step | run-straight-through — set only when execution_mode is inline
spec: none
spec_hash: none
plan: none
plan_version: 1                # 1 = the initial plan; each replan adds 1
plan_hash: none
testing_readiness_version: 1    # parent completion checkpoint required before planning
testing_readiness: none         # readiness artifact path, resolved within Plan before stage planning
testing_summary: []             # script-owned missing-strategy repos and observed verification methods; new runs only
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
current_activity_updated_at: none # host UTC timestamp saved by the activity helper; optional on older states
pending_inputs: []              # script-owned JSON records; blocking requests pause, optional requests preserve status
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

**Checkpoint rule** — at every transition, rewrite the field block and append one row to the Audit log *before* starting the next phase. Immediately before that state-file write, capture the timestamp from the host clock with `date -u '+%Y-%m-%dT%H:%M:%SZ'` and copy that exact output verbatim into the row's `Time` cell. Do not use the session clock, infer a time, reuse an earlier capture, estimate, or back-fill a timestamp; the capture must be the final pre-write operation for that checkpoint, including the first row a run ever logs. This keeps the log aligned with the local clock that renders the dashboard. After every phase that changes files (close-the-gaps, plan, fix-plan, execute, lightweight, final-sync), re-record `head` and `worktree_fingerprint`. Whenever the user edits the spec or plan by hand at a pause, re-record `spec_hash` / `plan_hash` before the next phase starts. Immediately after rewriting the field block, also regenerate `make-it-work/<TICKET>/<TICKET>-status.html` from the fields just written — never let the two fall out of sync (see Progress dashboard below).

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

For narration/activity updates, use the `activity` operation under [references/activity.md](../activity.md); it saves the narrated sentence, timestamp and audit row and refreshes the dashboard together. State transitions and Audit-log edits still use their existing write procedure, followed by the helper's `render` operation.

The renderer owns parsing and validating the state and current plan, calculating timing and loop-aware timeline state, escaping state-derived content, reading the fixed logo and HTML template from this skill's assets, and atomically replacing `<TICKET>-status.html`. Never reproduce, patch, or hand-edit the generated HTML. Its inputs are the workflow state, the plan while step progress is needed, and, after completion, the optional delivery plan/progress journal. Delivery never changes implementation's Complete status, loop counters, or elapsed time. Its own journal drives the Deliver dot, repository results, timestamps and links; its helper regenerates existing dashboards after delivery checkpoints.

**Never backfill** — when Resume finds a run with no status file, do not invoke the renderer merely to add one. Only tickets whose state file was first created through one of the two creation paths above participate in dashboard updates. Once a participating ticket has a dashboard, every required regeneration uses the same command.

**Renderer failure** — a nonzero exit means the state or referenced plan violates the dashboard contract, or the dashboard could not be written. Do not enter the next phase and do not append a transition row describing progress that did not occur. Report the renderer's error, correct the source state/plan when the correction is unambiguous, and rerun the command. Because the renderer writes atomically, an existing dashboard remains intact on failure.

**Workflow decision audit:** read [references/workflow-decisions.md](../workflow-decisions.md) at Start and Resume. Record every explicit user workflow choice from questions, chat or invocation options, including approvals, refusals, permission scope/revocation and channel selection. Decisions that change phase belong in that transition row; use `dashboard-checkpoint.mjs decision` for other decisions. Carry pre-state choices into the first row. Distinguish user choices from automatic policy/defaults, reference exact approved versions, preserve history and refresh the existing dashboard. Stages report choices to the main session before dependent work. The reference defines the shared input and resume contract; permission journals remain authoritative.

For controller runs, run `workflow.mjs init` alone and perform its `next_action`: send `next_action.text` unchanged as a standalone user-visible assistant response with no tool calls. Finish that response so Stop can confirm the runtime text; it continues a normal new run automatically without a user reply. Then follow `continuation` into Context check. Do not await acknowledgment. For the pending-offline path, include it in the existing documented stop message. Do not combine initialization and context checking in one tool call. For legacy creation paths, after successful dashboard creation, display a clickable Markdown link labeled **Open implementation dashboard**, targeting the actual HTML file's resolved absolute path. Wrap the link target in angle brackets when its path contains spaces. Present the link in assistant chat, not only in tool output or as a code-formatted path. Show it once, in whichever of Start's two creation points creates the state file first for this ticket (New run's first chat message, before Context Check; or Pending offline refinement's stop message). Never repeat it at later checkpoints, and never mention it for Resume. Providing the link does not require automatically opening a browser.

---

## Narration

Read and follow [references/activity.md](../activity.md), including inside inline stages, testing readiness, and nested regression. Save each work description before the chunk starts. Before every subagent dispatch, checkpoint what the agent will do; keep that description visible while awaiting its result, then report the actual next activity. Subagents do not write workflow activity or edit HTML; legacy single-step Progress helpers retain their required dashboard refresh.

Before each substantial work chunk, say one high-level sentence in chat and checkpoint that exact sentence with the helper's `activity` operation before starting. Use one update per chunk, not per tool call. The activity reference defines retry/render recovery and clearing both `current_activity` and `current_activity_updated_at` on phase changes or Paused, Stopped and Complete checkpoints. The dashboard shows activity only while In Progress.

**Worked example — Start's own checkpoints.** Start is the stretch of work most likely to be someone's first impression of this pipeline, and it runs through several tool calls (autonomy choice, branch guard, state-file/dashboard creation, Context check) with no interstitial text by default — apply the rule above explicitly here:

- After the branch guard resolves, say in one sentence what's about to happen, e.g. "Setting up the run — creating the state file and dashboard, then checking the project has the context this pipeline needs."
- After Context check's outcome (pass or stop), say so in one line before continuing.
- After Context check succeeds and any reuse/redo choice resolves, say what phase is starting next, e.g. "Starting refinement — I'll explore the relevant code and then ask clarifying questions." — before silently diving into Phase 2/3 code exploration.

---


### Write Tests in HTML

For test_writing_version: 1, show a distinct Write Tests stage between Plan/approval and Execute, including repeated preparation after replans/fix amendments. Use controller state and audit timing, never implementation Progress, to show its activity. Expected red is successful preparation; not-run remains unverified. Show the numbered Test Preparation report in Artifacts through the existing formatted reader and original-file link. Keep preparation activity and outcomes in the audit log, with report links; do not add a standalone preparation-details section. Old reports are historical; changed-plan evidence is superseded. Manual-only preparation is not applicable, Lightweight skips it, and legacy history gains no invented stages. The coordinator owns all HTML updates, including worker wait/interruption states.
