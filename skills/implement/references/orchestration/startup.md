
# Implement

**Role:** Act as a thin orchestrator for the make-it-work pipeline.

**Goal:** Take one ticket from request to a reviewed, context-synced implementation by running the existing stage skills in order. `implement` assesses the ticket's risk to choose the run mode, decides which phase runs next, runs that stage skill, interprets the outcome it reports, records the transition, enforces the loop limits, and performs the final context sync. It never redoes a stage's own reasoning — refinement belongs to `close-the-gaps`, planning to `plan-the-work`, implementation to `execute` (or, in Lightweight mode, a dispatched implementation subagent), review to `review-the-code`.

**Autonomy changes:** Before Start or Resume, read [references/autonomy-changes.md](../autonomy-changes.md). Keep this contract active during inline stages: chat changes queue for the next phase, while the saved effective mode governs the current phase.

**Ticket updates:** For an explicitly supplied tracker ticket or a run with a saved `ticket_publication` journal, read [references/ticket-publication.md](../ticket-publication.md) at Start/Resume and keep it active through the run. `implement` alone publishes accepted specs, plans (attachments or authorized comment fallback), significant blockers, completion/review/verification summaries and one final Jira HTML dashboard attachment through available connector capabilities, under a separately saved, explicit consent. Autonomy never grants ticket-write permission. Local spec/pasted-content runs stay local unless the user explicitly supplies a tracker destination.

**Fresh-run response order (Guided, Autonomous and Autopilot):**

1. Create the state and HTML with `workflow.mjs init` in its own tool call.
2. The initializer returns `next_action.type: assistant_message`. Perform that
   action immediately: send `next_action.text` as a user-visible assistant chat
   message before calling any further tool, including an activity checkpoint,
   a reference read, or Context check. Send a standalone assistant response with
   no tool calls, then finish that response. The Stop hook confirms its runtime
   text and continues the active workflow automatically. For example:

   [Open implementation dashboard](</absolute/project/make-it-work/TICKET/TICKET-status.html>)

   I'll check the project context next.

   The tool result's `delivery_status: not_sent` means this message is still
   yours to send. If only tool calls/results have occurred since init, the link
   has not been shared in chat. Emit it now; a later assertion that it was sent
   does not count.

3. After that internal response boundary, follow `continuation`. A normal
   run continues into Context check for the same user request, without a reply,
   acknowledgment or approval. Do not wait for the user to restart it.

The skill's startup-presentation hooks reinforce this order. The immediate
post-init reminder requires the assistant chat action. Stop confirms the exact
clickable link from its runtime `last_assistant_message` rather than waiting for
the asynchronously written transcript. It saves a local confirmation receipt
bound to the session, initialization, run start and dashboard. Later tool hooks
can use that receipt while the transcript catches up. This is evidence of
assistant output, not evidence that a person read or approved it. Older runtimes
without that payload retain the bounded transcript fallback. Partial final JSONL
writes and diagnostic request replays do not count as new announcements.
If a tool was denied after the link streamed, finish the standalone response;
do not repeat the link or keep retrying tools. Stop requires the actual chat link
and checks that a fresh run is no longer In Progress at any stage. Continue the
saved stage in this turn until completion or a genuine saved pause/stop. Pending
offline-answer waits retain their existing behavior.

When a delegated background agent is still running, yield with a brief waiting
update and let its completion notification resume the session. Do not launch
shell sleeps, file watches or repeated status polls merely to keep the turn open.
The Stop hook permits this wait only with runtime launch evidence for a live
agent launched in the current Refinement, Plan, Execute, Lightweight, Review or Fix phase.
Refinement includes delegated code surveys. Plan includes delegated testing-readiness and plan-drafting work. The workflow stays In Progress; yielding does not complete or pause it. Completion,
failure or a runtime inventory showing the agent is no longer running restores
the continuation requirement. A waiting claim, shell job or agent from an earlier
phase does not qualify. On hand-back, verify the result and continue the stage. The hooks record local,
sanitized interruption and wait observations for terminal workflow feedback;
recording failures do not change enforcement or the saved workflow status.

New initialization also captures a read-only baseline of application files in
every approved repository. Before the first authorized Execute or Lightweight
stage, tool hooks detect changes relative to that baseline and Stop blocks a
terminal response even if a same-phase stop was saved. Workflow artifacts,
Markdown, project context under .claude and docs are excluded so refinement and
planning can write their documented outputs. Existing local edits are preserved.
This detects completed tool mutations; it does not undo them or sandbox Bash.
On a violation, preserve the edits and recover through refinement, risk assessment,
the approved implementation route and independent review. Resume the saved phase
if an internal failure was checkpointed as Stopped. Never claim a bypassed change
is complete or ask the user to accept it as the default escape. Only a genuine
external blocker justifies asking for guidance. A new user turn clears the fresh
startup obligation; these hooks do not replace Resume checks or retrofit old runs.

The standalone announcement response is an internal verification boundary, not
a workflow pause. Do not request acknowledgment, ask whether to continue, or
require another user message. Let the Stop hook resume the active run, then
continue through the chosen autonomy's normal workflow
until a genuine documented question, approval, pause, stop, or completion.
Use an ordinary assistant text block; thinking/progress updates displayed as
`· summary` can strip links and do not count. Do not claim to open a browser.
For **Pending offline refinement**, the existing offline-answer wait is a genuine
pause: include the link in that stop message and follow its existing resume
instructions instead of entering Context check.

**Pipeline checkpoint:** Before editing implementation code or tests, carry out Start's branch guard and create the ticket's workflow state and dashboard, send the returned startup chat message before any further tool, and continue with Context check in the same turn. Follow the saved phase transitions and required stage skills through review and final sync. Only the run mode chosen under Risk assessment may skip stages (Lightweight skips Plan and Execute). No mode waives the mandatory minimum — the refined spec, the independent review, and the final context sync — and nothing waives a handoff, checkpoint, or log row. If a required stage cannot run, checkpoint its documented stop in the state instead of implementing the ticket directly. Do not report a ticket as complete merely because its code and tests pass; `status: Complete` requires the pipeline's terminal checks.

---

## Usage

```
/make-it-work:implement [TICKET-ID | path/to/spec.md] [--autopilot] [--mode lightweight|tdd] [--workspace path]
```

Or paste the ticket content directly into the chat after invoking.

- **`--autopilot`** — strip this flag before resolving the ticket or spec path. It selects Autopilot without the initial autonomy question. This flag alone leaves ticket updates off; an explicit scoped instruction or the same run's saved consent can authorize publication. Both interactive Autopilot choices use the same execution policy: no `AskUserQuestion` calls during implementation, and `--autopilot` forwarded to every dispatched stage. Requirements-conflict resolution and revised-spec approval are mandatory human exceptions during implementation. After a package-enabled run is Complete, the optional delivery offer is another exception: it always asks, but never delays or changes the completed result. It never commits, pushes, opens a PR, invokes `go-deep`, or guesses through a missing/contradictory required fact; those cases checkpoint a `Stopped` state with an actionable reason. Testing readiness may configure minimal test tooling and follow `define-test-strategy` inline before planning.
- **`--mode lightweight|tdd`** — strip this flag the same way. It forces that run mode for a new run (`mode_source: user`); risk is still assessed and recorded, and escalation still applies (see Risk assessment). Record it as a flag decision in the first Audit-log row. An explicit chat request for a mode has the same effect. An older run without `adaptive_version` ignores it.
- **Ticket key or pasted content** — derive `<TICKET>` exactly as `close-the-gaps` Phase 1 does: the ticket ID; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD`.
- **Spec path** — `<TICKET>` is the file name without its `-spec.md` suffix.
- **No argument** — list `make-it-work/*/*-state.md` files whose `status` is not `Complete`. Exactly one → offer to resume it; under `--autopilot`, resume it only when its saved autonomy is `autopilot` and its workspace fingerprints still match. Several or none → ask the user; under `--autopilot`, stop with the matching no-safe-default reason. Ignore flat artifacts from runs started before the per-ticket layout.

## Autopilot mode

While the current autonomy is `autopilot`, construct every later ordinary implementation question/checkpoint payload exactly as the interactive path would, but do not call `AskUserQuestion` or wait during implementation. `--autopilot` and Start's autonomy question select the initial mode; a later explicit chat request follows **Change autonomy during a run** below. Requirements-conflict resolution and revised-spec approval also require explicit user input in Autopilot; see **Requirements conflict — return to refinement**. Workspace repository/branch selection is a separate mandatory explicit approval, including Autopilot; see [workspace.md](../workspace.md). Completion's optional delivery offer happens only after the run is terminal and is always asked, including in Autopilot. Append each orchestration-level resolution with the shared schema in `docs/autopilot-log-schema.md`. When `--autopilot` is supplied and `<TICKET>` is known, initialize `make-it-work/<TICKET>/implement-autopilot-log.jsonl` fresh before Start's existing-run check, so a hard stop there can still be logged, unless an explicit mode-change request in this message overrides the flag; that request uses the reference's log-preservation rule. When Autopilot is selected interactively for a new run, initialize it immediately after that choice, before the branch guard. Log the autonomy selection as the first resolution in either case; the rationale must distinguish a user's selection from a flag-selected default. Use `node "<base>/../../scripts/decision-log.mjs" init|append implement --root "<repo-root>" --ticket "<TICKET>"` in its own Bash call when Bash is available; a denied log write never blocks unrelated pipeline work.

Auto-resolve only these safe defaults: apply the assessed (or forced) run mode and any escalation; create the suggested ticket-named feature branch when starting on the base branch; retain a clean resumable autopilot run's saved mode; establish the recommended minimal test setup before planning; continue with clear related/unrelated regression classification; choose sequential dispatch; and replan when the existing Autonomous rules already prescribe replan. Honor an explicitly selected manual verification policy without asking again; never infer it from unavailable automated results. Forward `--autopilot` to `close-the-gaps`, `define-test-strategy` during readiness, `plan-the-work`, `execute`, and the Review dispatch; `execute` forwards it to `run-regression` for its automated completion gate.

Stop, record `chosen: null`, set `status: Stopped`, clear `current_activity`, regenerate the dashboard, and report the remediation when there is no safe default: no ticket or several resumable runs, detached HEAD, an existing completed/stopped run or standalone artifacts that would need a reuse/overwrite choice, changed worktree on resume, unresolved TBDs or plan blockers, uncertain regression ownership, an unavailable regression result, a review `Route: human` finding, or any stage's own hard stop. A normal terminal feedback retrospective never re-opens a successful run: write the best available share-safe diagnosis and retain material uncertainty in `openQuestions` rather than asking follow-ups.

At the terminal report, summarize auto-resolved decisions and the implement log path in addition to the normal completion/stop summary.

## Change autonomy during a run

Follow the mandatory [autonomy-change contract](../autonomy-changes.md) for chat requests: queue the new mode for the next phase, preserve the current phase's effective policy and pending approvals, and refresh an existing dashboard before acknowledging the queue.

---

## Start

**Workspace routing comes first:** read [references/workspace.md](../workspace.md) before resolving a current branch or running the checks below. Resolve layout and artifact root with the shared helper. A workspace needs no root `CLAUDE.md` or `.git`. For workspace runs, run `find-the-repos` inline, preview the exact repositories and branch actions, and obtain explicit user approval in **every** autonomy mode before creating or switching branches. Present the prepared preview dashboard as a clickable Markdown link, `[Review repository and branch selection](<returned HTML path>)`, alongside the exact selection; a path in backticks does not satisfy sharing the HTML link. Run the early context precheck on the selected repositories before applying those branch actions. Then use the per-repository branch helper instead of the single-repo branch guard below. An existing workspace run resumes its saved contract before any new discovery or branch changes.

Resolve the ticket, current branch, base branch, and any existing state file before these checks. Work through them in order. A new run chooses autonomy before creating a branch; an existing run keeps its saved autonomy and goes through Resume before any branch change.

If this message explicitly requests a mode change, apply **Change autonomy during a run** before any saved-Autopilot or flag-mismatch shortcut below. Keep all branch/workspace comparisons and existing-run checks; a mode change does not approve Resume anyway, Redo, or Start over.

1. **Detached `HEAD`** → stop: tell the user to create or switch to a feature branch first. A run must never start on a detached HEAD — there is no branch for the work this run produces to live on.
2. **Existing run** — a state file exists:
   - `status: Complete` with an explicit request to sync/reconcile/retry **ticket updates for this completed run** → use the publication reference's completed-run path only. Preserve Complete, its artifacts and consent; do not start a new implementation, repeat stages or re-offer delivery. Report actual publication results and finish.
   - `status: Complete` with an explicit response to its saved delivery offer, or a request to continue its already opted-in preparation → follow Completion's delivery-response handling and inline `deliver` continuation below. Preserve Complete and its package; do not offer a new implementation or repeat the delivery opt-in question. A previously recorded opt-in is not exact-plan approval.
   - `status: Complete`, or `status: Stopped` with `phase: context-check` → ask whether to start a new run (the state file is overwritten) or stop. Under `--autopilot`, stop rather than overwriting the state or artifacts. A run that never got past Context Check produced no artifacts worth resuming. Only if the user chooses a new run, continue to Choose autonomy below.
   - Any other status → go to **Resume**. Do not ask for a fresh autonomy choice or create a branch before comparing the saved branch and workspace fingerprints.
3. **Early context precheck, then startup choices for a new run** — run the read-only **Early context precheck** below before autonomy, refinement-destination or publication questions. Missing go-deep structure is informational; a known mandatory-context blocker stops before initialization, consent or branch changes. Then complete **Choose autonomy** before constructing any destination question; never batch these into the same `AskUserQuestion` call. Then follow **Choose refinement destination**, before the branch guard: Guided/Autonomous ask unless a destination is already resolved; either Autopilot choice uses the documented default without prompting. Hold the resolved values and any scoped ticket-update selection until the state file is created; there is no state file or dashboard to update yet. Either Autopilot choice applies the same unattended policy as `--autopilot` from this point onward, including the branch guard and decision log. Autonomy does not supply a user destination choice; Autopilot's default is a policy resolution.
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
5. **Pending offline refinement** — `make-it-work/<TICKET>/<TICKET>-questions.md` exists with `**Status:** Awaiting Answers` → before writing the state, read `<base>/../../.claude-plugin/plugin.json` and capture its exact nonempty `version` value as `plugin_version`; if the manifest cannot be read or has no version, stop and report that error rather than creating an unattributed run. Then create the state file with the selected `autonomy`, `phase: close-the-gaps`, `status: Paused`, `pause_reason: offline refinement pending`, and a real captured timestamp in `start_time` (same capture rule as the Checkpoint rule's `Time` cell). Its first Audit-log row goes from `start` to `close-the-gaps` and records the autonomy choice, branch-guard outcome, and pending offline refinement. Create the progress dashboard (`make-it-work/<TICKET>/<TICKET>-status.html` — see Progress dashboard below), immediately presenting the returned `startup_message` (or the legacy **Open implementation dashboard** link) once in the next assistant stop message before further workflow tools, as specified above. For an explicitly supplied tracker ticket, perform the ticket-publication reference's Start and consent procedure before reporting the pause, with the same Autopilot/local-only rules as New run below; tell the user to finish `/make-it-work:close-the-gaps <that path>` and then run `implement` again; stop.
6. **New run**:
   - Capture a real timestamp into `start_time` (same capture rule as the Checkpoint rule's `Time` cell).
   - Before the first state-file write, read `<base>/../../.claude-plugin/plugin.json` and record its exact nonempty `version` value in `plugin_version`. Do not derive it from the cache directory name, package metadata in the target repository, or a chat message. If the manifest cannot be read or has no version, stop and report that error rather than creating an unattributed run. `plugin_version` is immutable for the run: every later checkpoint, resume, and feedback write preserves it unchanged.
   - Create the state file with `phase: context-check`, `status: In Progress`, the selected `autonomy` and resolved `refinement_destination`, and every other field at its template default (including `real_rows_from: 1`). Log the first Audit-log row: `From: start`, `To: context-check`, with an `Outcome / reason` recording the autonomy choice, refinement destination and its source, any `--mode` flag, and branch-guard outcome (e.g. `New Guided run; Refinement questions: here (user choice); branch <name> created per branch-guard choice` or `New Autopilot run; Refinement questions: here (policy default); proceeding on existing feature branch`). Fold these pre-state choices into this one row; no separate decision rows can be written before the state file exists.
   - Create the progress dashboard (`make-it-work/<TICKET>/<TICKET>-status.html` — see Progress dashboard below) from those fields. Immediately perform the initializer's standalone assistant-message action before calling any further tool. Finish that response so Stop confirms it and automatically continues Context check. Do not wait for acknowledgment at the link. For legacy initialization, use the clickable **Open implementation dashboard** link described above.
   - For an explicitly supplied tracker ticket, follow the ticket-publication reference's **Start and consent** procedure once. Save scoped consent separately from autonomy; publication unavailable, declined or unanswered leaves the implementation workflow local. Under Autopilot, use existing explicit permission or retain local without prompting. Do not configure a tracker for a local spec/pasted requirement without an explicit destination.
   - *Only then* run **Context check**. **If its outcome is "stop"** (an explicit mandatory-context blocker or unresolved essential fact), set `status: Stopped` explicitly — not `Paused`: there is no mid-run point to resume into until the concrete blocker has been resolved. On reinvocation, follow Start's existing choice for a stopped context-check run; never overwrite it automatically. Log this as the phase's own Audit-log row (`From`=`To`=`context-check`, `Outcome / reason`: the exact stop message shown to the user), regenerate the dashboard, then stop exactly as Context check's own Outcomes already specify.
   - If Context check succeeds, check whether `make-it-work/<TICKET>/<TICKET>-spec.md` and/or `make-it-work/<TICKET>/<TICKET>-plan.md` already exist from standalone runs. If so, show what was found and ask: reuse them and start at the next phase, or redo from that phase. Under `autopilot`, stop rather than choosing between stale artifacts.
   - **Close out Context check explicitly:** once the reuse/redo decision above resolves, update `phase` to the actual starting phase (`close-the-gaps` for a fresh spec, or `plan` for a reused spec/plan so testing readiness runs before execution). A reused plan is retained rather than redrafted unless readiness exposes a required change. In an adaptive run, first run Risk assessment on the reused spec: a reused plan keeps `mode: tdd` (`mode_source: user`, since reusing it chose TDD), while a reused spec alone goes to Spec approval in Guided (to show and confirm the mode) and otherwise starts at `lightweight` or `plan` by its mode. Log the closing Audit-log row `context-check → <that phase>` with an outcome describing the decision, then regenerate the dashboard. This flips the pre-activated `context-check` dot from `current` to `passed`.

---

## Context check

For `workspace_version: 1`, apply this check independently to each approved repository from `workspace_contract`; no root workspace context is required, and unselected siblings are excluded. Pass the explicit repo root to each inventory call. The controller inventories the same repositories at `context-ready` and records missing context in Context discoveries.

Run `node "<base>/../../scripts/context-inventory.mjs" inspect --root <project-root>` under [the inventory contract](../../../../docs/deterministic-artifacts.md#documentation-inventory). Its signals/completeness/missing paths drive the following outcomes; do not manually recreate those filesystem checks. Workspace structure and affected-repo discovery retain their existing rules.

`implement` inventories available `go-deep` context in two layers; completeness is informational, not a startup requirement:

- **Signals** (the same ones `go-deep`'s own prior-run detection uses): a `uc-*` or `domain-*` directory under `.claude/skills/`; a `CLAUDE.md` containing a Skill Loading Gate, Skills Reference, or After Any Feature Change section; `.claude/rules/architecture.md` or `.claude/rules/product.md`.
- **Completeness:** `CLAUDE.md` containing the Skill Loading Gate, `.claude/rules/architecture.md`, `.claude/rules/product.md`, and at least one `.claude/skills/domain-*/SKILL.md`.

Outcomes:

- **No signal or partial context** → continue using [ticket-scoped context discovery](../context-discovery.md). Report missing pieces as context limitations, not instructions to repair before starting.
- **Complete** → continue with existing repository loading gates and context.

In every case, stop for unresolved essential facts or unavailable explicitly mandatory skills/rules, not merely missing optional go-deep structure. Inventory read/type errors remain errors; never treat unreadable guidance as absent.

Test strategy (absence never stops Context check): check the same root, and when it is a workspace root, each repo directory under it. Record repos with missing or old strategies for testing readiness before planning:

- **Missing** → report: "No test-strategy skill — testing readiness will discover or establish the setup before planning."
- **Older strategy without `## Test Map`** → report: "Testing readiness will regenerate the strategy and map from current tests and documentation. Obsolete rules/pointers require manual cleanup." Do not convert or delete old rule files.

Show any warning with Context check's outcome and record it in the closing context-check Audit-log row.

Never run `go-deep` yourself.

---

## Early context precheck

After resolving the repository set and checking whether this is a new or resumed run, run `node "<base>/../../scripts/context-inventory.mjs" inspect --root <repo-root>` for each selected repository before optional startup questions, branch changes, journal initialization or publication consent. Use the same inventory and completeness requirements as Context check. Do not inspect unselected siblings or require workspace-root context. An existing run keeps its saved Resume path rather than being treated as a fresh start.

Missing or partial go-deep structure does not stop startup. Record the affected repo and missing pieces for the ordinary Context check and use [ticket-scoped context discovery](../context-discovery.md) in every autonomy mode. Explicit repository requirements still apply; an unavailable mandatory skill/rule or unresolved essential fact stops with a concrete reason. Do not invoke onboarding or repair automatically. Existing runs retain their saved Resume path, pending answers and approvals; never restart a stopped run silently.

Keep the inventory result for the ordinary post-initialization Context check; rerun only if the selected roots or context files changed. The controller records missing context at `context-ready`. This is a cheap read-only precondition check, not another user question, agent or onboarding stage.

## Choose autonomy

For a new run, ask once before the branch guard with a single `AskUserQuestion` containing only the autonomy question, and wait for its answer before constructing any dependent startup prompt. Hold the answer for the first state-file write. An explicit chat mode selection supplies that answer directly; otherwise `--autopilot` skips the question and selects `autopilot` without granting ticket-write consent. Both interactive Autopilot choices use the same execution policy, including automatic creation of the suggested branch on the base branch. Initialize and append the autopilot decision log as described in Autopilot mode.

When the question will be shown and the user supplied an explicit tracker ticket/destination, first perform the publication reference's read-only target/capability discovery. If the exact issue/site, original description and at least one usable write operation are available, include the fourth option below. This discovery does not initialize a journal, write to a tracker or change the branch. Omit the combined option for local specs/pasted requirements without an explicit destination, ambiguous/inaccessible tickets, or connectors without usable write capabilities. Failed discovery does not block the ordinary three choices.

- **Guided (Recommended)** — pauses for approval after the spec (with the assessed run mode), after the plan when the run has one, and for every human decision.
- **Autonomous** — no approval gates, and replans automatically when the plan stops holding. It still asks every question a stage asks and every uncertain regression, and stops at the loop limits and at completion.
- **Autopilot** — runs without approval or stage-question prompts, with ticket updates off unless separately explicitly authorized. It uses the policy in Autopilot mode and stops safely when no documented default exists.
- **Autopilot + update ticket** — when eligible, the same unattended implementation plus updates to **<issue> at <site>**: refined description replacement after preserving each nonempty description being replaced in an original-description comment, accepted plans as attachments or comments when uploads are unavailable, significant blocker comments, implementation/review/verification summaries and one final HTML dashboard attachment at completion for Jira where uploads are supported. Name the actual supported operations and anything unavailable in this option's description or question body, so selection authorizes a concrete scope. Comments-only connectors remain eligible; their offer excludes description replacement and uploads. If backup comments are unavailable, exclude nonempty description replacement too.

Offer the three ordinary choices plus the combined option only when eligible. Keep **Guided (Recommended)** as the recommended default. Both Autopilot choices persist `autonomy: autopilot`; do not add a fourth autonomy enum, dispatch flag or execution policy.

The combined choice is explicit user consent, never an auto-resolved default. Hold its exact answer, target and granted operations until Start creates the workflow state. Then follow the publication reference's initialization and `consent` procedure, saving `allowed` and `artifact_comments` for that disclosed scope and refreshing the dashboard; do not ask a second ticket-write consent question. Guided/Autonomous retain their separate publication offer. Plain Autopilot supplies no write consent and does not trigger another publication question. A later explicit scope instruction takes precedence; Resume preserves this run's saved scope instead of re-offering startup choices. If the selected target/capabilities become unavailable before consent can be saved, retain local artifacts and report the limitation without claiming updates are enabled or broadening the target.

## Choose refinement destination

Follow [references/refinement-destination.md](../refinement-destination.md) after choosing autonomy and before dispatching refinement. Guided and Autonomous explicitly choose where questions go even when Slack is unavailable; discover deferred Slack tools before offering supported actions and explain any limitation. Persist the choice in `refinement_destination` independently from autonomy and ticket consent. For either Autopilot choice, `--autopilot`, or an explicit chat selection of Autopilot, do not show a destination question: retain an explicit destination or default to `here` as policy. That default never enables live product questions during Autopilot; unresolved required facts follow the stage's documented hard-stop policy. Skip destination resolution for an existing pending questions file or a spec already accepted for reuse; neither needs a new refinement message.

---

## Resume

If `ticket_publication` names a journal, read it using the publication reference before any further tracker write. Retain consent and successful-operation IDs; reconcile interrupted writes rather than replaying them. Missing/`none` stays local without another consent offer unless the user explicitly asks to enable publication. Publication permission decisions are resume-transparent under the workflow-decision contract; use the checkpoint helper's `resume` result when identifying the last work row. Publication failures never bypass the workspace/resume checks below.

Compare the current `branch`, `head`, `worktree_fingerprint`, `spec_hash`, and `plan_hash` against the state file.

An explicit mode-change request queues the selection before the saved-mode rules below; the old invocation flag cannot overwrite it or cause a mode-mismatch stop. Effective autonomy remains unchanged until the next phase transition. Without such a request, retain the existing flag-mismatch behavior. For Resume's last-row classification, run `dashboard-checkpoint.mjs resume --state <state-path>` and use `last_work_row`, per the workflow-decision contract. It ignores explicitly transparent same-phase decisions and legacy autonomy/publication rows; other decisions still preserve interruption evidence. Keep all other interruption checks. Once a clean resume is established, do not offer another mode choice when this message already selected it. If there is no new selection, retain the saved mode, including any mode applied at an earlier phase boundary; retain its queued selection separately.

- **Paused on `Slack refinement pending`, with nothing else changed** → this takes precedence over the buckets below. Show one line saying the run is waiting on the Product Manager's Slack replies, then resume as Close the gaps → Resuming a Slack pause describes. Changes inside `make-it-work/` (such as the user answering the questions file by hand) don't count as changes. Anything else changed → the last bucket below.
- **Nothing changed, and the last work row returned by the checkpoint helper closed its phase** (that row's `From` differs from its `To`; other same-phase decision rows still never count as closing a phase) → show one line (current phase and autonomy level), offer to change the autonomy level in Guided or Autonomous, then continue at `phase`. If `--autopilot` was supplied without an explicit chat mode-change request, continue only when the saved autonomy is `autopilot`; otherwise stop rather than changing its mode. If the saved autonomy is `autopilot`, retain it and continue without asking, even when the current invocation omitted the flag. This bucket never applies while `phase: context-check`, even when its one logged row (`start → context-check`) technically has `From ≠ To` — that row only records *entering* Context Check, and Context Check's own mandatory follow-on orchestration (the reuse/redo prompt and the closing row) may not have run yet; a `phase: context-check` state always falls to the next bucket instead.
- **Interrupted mid-`context-check`, mid-`close-the-gaps`, mid-`review`, or mid-`final-sync`, with nothing else changed** → these phases are safe to repeat: tell the user, then re-run that phase from its start. For `context-check` specifically, "from its start" means re-entering Start check #6 at its "run Context check" bullet and continuing through it exactly as a New run would — the reuse/redo prompt and the explicit closing row/phase-update — since that orchestration lives in Start, not in a `## Phases` subsection of its own. Keep the saved autonomy; only a legacy state still reading `autonomy: pending` needs Choose autonomy before rerunning Context check, then a same-phase decision row recording the choice and a dashboard refresh.
- **Anything changed, or the run was interrupted mid-`plan`, mid-`fix-plan`, mid-`execute`, or mid-`lightweight`** (the phase started but has no closing log row) → list exactly what differs, then ask; when the current autonomy is `autopilot`, stop rather than choosing among Resume anyway, Redo, or Start over:
  - **Resume anyway** — re-record the fingerprints and continue. For an interrupted execute, run `execute` again; it resumes from its own Progress line. For an interrupted `lightweight`, dispatch it again with the same operation; the subagent continues from the changes already in the working tree.
  - **Redo the affected phase** — the earliest phase whose artifact changed; code changed outside the workflow → execute (Lightweight mode: lightweight).
  - **Start over** — a new run for this ticket.

An early-replan row (`review → plan` or `fix-plan → plan`) is an ordinary replan entry: it is logged in the same checkpoint that bumps `replans_used` and `plan_version`, so a state with `phase: plan` and that row last resumes at `plan` in replan mode, never as a stale fix-plan round. An `Escalation:` row into `plan` is likewise logged in the checkpoint that applies its side effects, and resumes at `plan` in initial mode with the escalation baseline. An interruption before the row was logged leaves `phase: fix-plan` (or `review`) with the counters untouched; it takes the buckets above, and the early-replan triggers are re-checked on re-entry.

Ask this in both interactive autonomy levels. Never assume a changed repository is still safe to resume.

**Legacy-schema migration:** before applying any of the three outcomes above, check whether the state file's raw field block is missing the `real_rows_from` key entirely (it predates this feature). If so, add it — along with any other field-block key introduced by this feature or an earlier one that the file is missing, each at its template default **except `handoff_version`, `final_package_version`, `verification_version`, `acceptance_evidence_version`, `review_scope_version`, `review_context_version`, `review_checks_version`, `feedback_evidence_version`, `adaptive_version` and its fields, `testing_readiness`, `testing_readiness_version`, `ticket_publication`, and `plugin_version`** — and set `real_rows_from` to one more than the state file's current Audit-log row count at this moment (every row already logged is legacy; every row logged from here on is real). Never add these opt-in markers to an existing run: an older run continues with its original handoffs and completion path, and an old run without `plugin_version` remains explicitly unattributed rather than being backfilled with the currently installed version. This is the only migration Resume performs; it never touches a file that already has the key.

---

