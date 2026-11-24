# Fresh startup procedures

Read only after shared [startup routing](startup.md) establishes a fresh run. Shared routing and standing rules remain binding.

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
/make-it-work:implement [TICKET-ID | path/to/spec.md] [--autopilot] [--mode lightweight|tdd] [--workspace path] [--worktree | --continue-here] [--refinement-worker]
```

Or paste the ticket content directly into the chat after invoking.

- **`--autopilot`** — strip this flag before resolving the ticket or spec path. It selects Autopilot without the initial autonomy question. This flag alone leaves ticket updates off; an explicit scoped instruction or the same run's saved consent can authorize publication. Both interactive Autopilot choices use the same execution policy: no `AskUserQuestion` calls during implementation, and `--autopilot` forwarded to every dispatched stage. Requirements-conflict resolution and revised-spec approval are mandatory human exceptions during implementation. After a package-enabled run is Complete, the optional delivery offer is another exception: it always asks, but never delays or changes the completed result. It never commits, pushes, opens a PR, invokes `go-deep`, or guesses through a missing/contradictory required fact; those cases checkpoint a `Stopped` state with an actionable reason. Testing readiness uses existing automation without generating strategy metadata when no strategy exists; absent tooling then defaults to recorded manual verification. Repos with an existing strategy retain their setup flow.
- **`--mode lightweight|tdd`** — strip this flag the same way. It forces that run mode for a new run (`mode_source: user`); risk is still assessed and recorded, and escalation still applies (see Risk assessment). Record it as a flag decision in the first Audit-log row. An explicit chat request for a mode has the same effect. An older run without `adaptive_version` ignores it.
- **`--refinement-worker`** — explicit opt-in for a new local, single-repository Autopilot run only. Pass `refinement_worker: true` to controller initialization and record the flag in its first audit row. Read [the worker contract](../refinement-worker.md) for eligible initial refinement. No flag means inline; never infer it, add it on Resume, or enable it for Slack, workspace or Guided runs. Preserve explicit research/delivery instructions; unsupported refinement routes stay inline after runtime reconciliation.
- **`--worktree` / `--continue-here`** — select isolated worktrees or the current checkout for a fresh run; strip the flag before resolving the ticket. Without an explicit checkout choice, Guided/Autonomous offer both routes during startup; Autopilot retains the current checkout. Resume keeps its saved roots. Read [session worktrees](../session-worktrees.md) before preparing isolation.
- **Ticket key or pasted content** — derive `<TICKET>` exactly as `close-the-gaps` Phase 1 does: the ticket ID; otherwise a kebab-case slug of the title; otherwise `spec-YYYY-MM-DD`.
- **Spec path** — `<TICKET>` is the file name without its `-spec.md` suffix.
- **No argument** — list `make-it-work/*/*-state.md` files whose `status` is not `Complete`. Exactly one → offer to resume it; under `--autopilot`, resume it only when its saved autonomy is `autopilot` and its workspace fingerprints still match. Several or none → ask the user; under `--autopilot`, stop with the matching no-safe-default reason. Ignore flat artifacts from runs started before the per-ticket layout.

## Fresh-run choices and initialization

3. **Early context precheck, then startup choices for a new run** — run the read-only **Early context precheck** below before autonomy, refinement-destination or publication questions. Missing go-deep structure is informational; a known mandatory-context blocker stops before initialization, consent or branch changes. Then complete **Choose autonomy** before constructing any destination question; never batch these into the same `AskUserQuestion` call. Then follow **Choose refinement destination**: Guided/Autonomous ask unless a destination is already resolved, and may batch that question with checkout/branch selection below; either Autopilot choice uses the documented default without prompting. Resolve both before branch changes. Hold the resolved values and any scoped ticket-update selection until the state file is created; there is no state file or dashboard to update yet. Either Autopilot choice applies the same unattended policy as `--autopilot` from this point onward, including the branch guard and decision log. Autonomy does not supply a user destination choice; Autopilot's default is a policy resolution.
4. **Checkout and branch selection** — for a fresh Guided/Autonomous run with no explicit checkout choice, offer **Use isolated worktree (Recommended)** and the explicit current-checkout branch action below before changing any branch or initializing the workflow. This applies on `base` and on feature branches. A new branch in the original checkout does not provide isolation; the branch-only menu below is not a substitute for this offer. Reuse `--worktree`, `--continue-here` or an explicit instruction to use a particular checkout; do not ask again. A branch name alone does not select a checkout.

   Present this with the existing startup/branch selection, and batch it with the refinement-destination question when one is needed. Use this checkout option order and recommendation:

   1. **Use isolated worktree (Recommended)** — create a unique branch in a separate checkout with private workflow artifacts. The source checkout stays on its current branch; show the exact branch name and location in the existing creation preview.
   2. **Create branch in current checkout** when on `base` — show the collision-safe suggested branch name and actual starting HEAD, and say this directory will switch to that new branch. On a suitable feature branch, use **Use current branch: <branch>** instead, explicitly keeping that branch. Do not use the ambiguous label "Continue here" or mark the current-checkout option Recommended. Base-branch status or local edits, including `.gitignore`, do not reverse the isolation recommendation. A recommended new-branch action in the guard below applies only after selecting the current checkout.

   Include Stop and allow an optional different branch name for either route; say the user can request one. Do not require a naming question when accepting the suggested name. For isolation, the existing creation preview offers **Create worktree and branch**, **Use a different branch name**, and **Back**; follow [session worktrees](../session-worktrees.md) for revisions. For the current checkout, reuse the exact branch name approved in the startup choice or follow the existing custom-name guard below. On a feature branch, show any detected ticket mismatch and preserve its existing unresolved branch choice. Honor an explicit request to proceed on base through the existing guard. Do not add an acknowledgment or repeat an already approved exact branch action.

   - **Use isolated worktree / `--worktree`** → read and follow [session worktrees](../session-worktrees.md). Prepare the private session and use the existing exact repository/branch preview approval, including the starting commit and source/destination paths. Continue through its workspace initialization; do not run `git switch` in the source checkout or also execute the current-checkout branch guard below.
   - **Current-checkout choice / `--continue-here`** → apply the current-checkout branch guard below. If the startup option already named and approved its exact branch action, execute that action without asking the same branch question again. Selecting the checkout alone does not resolve an unpresented ticket mismatch or approve an unspecified branch change.
   - **Autopilot** → without an explicit isolation choice, retain the current checkout and its existing branch policy; never add a checkout question solely for this feature. Explicit isolation retains the existing exact repository/branch approval.

   **Current-checkout branch guard (current-checkout route only):**
   Workflow initialization also saves the supplied branch-guard outcome in the Implement Autopilot log if that checkpoint is missing, preserving earlier entries. Supply the actual outcome through `branch_guard`; do not initialize or replace the log again after workflow initialization.
   - **Current branch equals `base`** → compute a suggested branch name: `<TICKET>`; if `git rev-parse --verify --quiet refs/heads/<TICKET>` resolves (the name is already taken), try `<TICKET>-2`, `<TICKET>-3`, … incrementing until one does not resolve, and use that instead. Under the selected `autopilot` mode, choose `Create and switch to <suggested-name> (recommended)`, log that checkpoint, run `git switch -c <suggested-name>`, and stop with the command error if it fails — never proceed on the base branch. Otherwise ask with `AskUserQuestion` (`multiSelect: false`): *"You're on `<base>`. Where should this ticket's work go?"*, with these options:
     - Create and switch to `<suggested-name>` (recommended).
     - Create a branch with a different name.
     - Proceed on `<base>` anyway.
     - Stop.

     If the user picks **Create and switch to `<suggested-name>`**, that selection confirms the exact name: run `git switch -c <suggested-name>` immediately, without a second confirmation. If the user picks **Create a branch with a different name**, ask for the name and wait for their reply; use their answer as `<final-name>`, then run `git switch -c <final-name>`. If either command fails (e.g. the name became unavailable or the custom name is invalid), show the error and ask for a different name — never silently retry with a guessed alternative. Once the branch is created, continue to the next Start check.

     If the user picks **Proceed on `<base>` anyway**, continue to the next Start check without creating a branch.

     If the user picks **Stop**, stop here.
   - **Otherwise** → run the read-only `node "<base>/scripts/branch-ticket.mjs" check --repo "<repo-root>" --ticket "<TICKET>" --base "<base-branch>"`. If `mismatch: false`, continue without another branch question. It detects explicit ticket keys only; a generic branch name or local edits do not establish unrelated work. If `mismatch: true`, show the current branch, its ticket keys and this run's ticket **before refinement or initialization**. In Guided/Autonomous, ask once: **Continue on the current branch** / **Create a new ticket branch** (recommended) / **Stop**. A direct prior user instruction choosing this branch already resolves that choice. For a new branch, use the collision-safe naming rule above and show the exact proposed name in the option. Creating a branch here starts from the current HEAD; it does not restart from the base branch. If the user wants a base-branch restart, inspect local changes and obtain their disposition before switching; never stash, commit, discard or carry unrelated edits silently. Under Autopilot, stop on an unresolved mismatch and report the two ticket identities and these choices; do not silently switch or infer approval. Record the actual resolved choice in `branch_guard` and preserve baseline accounting. A helper failure stops this check with its error rather than implying a match. Workspace runs retain their existing explicit repository/branch preview approval; include any detected mismatch there without adding a duplicate prompt. Resume retains its saved fingerprint checks rather than rerunning new-run choices.
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

For fresh multi-repo runs, apply [repository impact](../repository-impact.md): initial discovery is bounded/read-only, and provisional context-only repos require no setup or onboarding repair. Finalize the impact assessment against the accepted spec before readiness or implementation. Existing repository/branch approvals and older-run behavior remain unchanged.


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

- **Missing** → report: "No test-strategy skill — testing readiness will discover existing checks before planning; Autonomous/Autopilot use manual verification when tooling is absent."
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
