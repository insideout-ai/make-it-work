---
name: implement
description: "Orchestrates the make-it-work pipeline for one ticket — context check → close-the-gaps → risk assessment → Lightweight implementation (low risk) or plan-the-work → write-the-tests (fresh worker) → execute (TDD) → review-the-code → final context sync — with saved, resumable workflow state, Guided, Autonomous, and unattended --autopilot modes, Lightweight → TDD escalation, capped fix/replan loops, and local end-of-run workflow feedback. Never commits implementation changes, pushes, opens a PR, or uploads feedback. Use when taking a ticket from request to a reviewed, context-synced implementation in one run."
disable-model-invocation: true
hooks:
  PostToolUse:
    - matcher: '*'
      hooks:
        - type: command
          command: 'node "${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/startup-presentation.mjs"'
          timeout: 10
  PreToolUse:
    - matcher: '*'
      hooks:
        - type: command
          command: 'node "${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/startup-presentation.mjs"'
          timeout: 10
  Stop:
    - hooks:
        - type: command
          command: 'node "${CLAUDE_PLUGIN_ROOT}/skills/implement/scripts/startup-presentation.mjs"'
          timeout: 10
---

# Implement

For generated files under `make-it-work/`, follow the [artifact naming, Git protection, usage and timing contract](../../docs/artifact-observability.md). Use helper-returned paths; new runs use `miw-` filenames and existing runs retain their saved convention. Before manually writing a new Markdown/JSON artifact, resolve its actual output with `node "<base>/../../scripts/artifact-output.mjs" resolve --root <project-root> --directory <artifact-directory-relative-to-project> --name <logical-filename>` and write/link the returned `file`/`relative`. Literal filenames below identify logical roles; do not bypass this resolver by writing those examples directly.

Take one ticket through context check, refinement, risk assessment, the selected
Lightweight/TDD implementation route, independent review, final context sync and
completion. Act as the parent orchestrator; use the existing stage skills for
their own reasoning. No mode waives refinement, review, final sync, evidence,
approval or completion gates. Implementation changes remain local and uncommitted.

`<base>` always means this Implement skill's directory, including inside its
references. Resolve sibling skills from `<base>/..`; do not substitute a cached
or similarly named plugin. Missing required resources are concrete blockers.

## Start and resume

Before any startup action, read and follow the complete
[startup/resume contract](references/orchestration/startup.md),
[controller contract](references/controller.md),
[stage integration contract](references/orchestration/stage-contract.md), and
[standing rules](references/orchestration/rules.md).
These preserve usage/flags, early context precheck, workspace/branch consent,
autonomy selection, publication consent, existing-run detection, resume hashes,
and legacy handling. After resolving existing runs and completing the read-only
early context precheck, fresh Guided/Autonomous runs offer **Use isolated
worktree (Recommended)** first, then name the actual current-checkout action:
**Create branch in current checkout** on base, or **Use current branch: <branch>**
on a suitable feature branch. Reuse explicit checkout choices; offer optional
branch naming in the existing selection/preview. Autopilot defaults to the current
checkout and Resume keeps saved roots. Show the full creation preview in chat;
keep the confirmation dialog short and plain text, without Markdown tables or
links. Apply the existing [autonomy-change](references/autonomy-changes.md),
[workflow-decision](references/workflow-decisions.md),
[activity](references/activity.md), [workspace](references/workspace.md), and
[ticket-scoped context discovery](references/context-discovery.md) contracts at
that contract's required point. Read [ticket publication](references/ticket-publication.md)
only for an explicit tracker destination or an existing publication journal.

For new controller runs use `workflow.mjs init`; the initializer loads
[the machine-readable defaults](assets/workflow-defaults.json), not this entry's
prose. Preserve every returned action, especially the immediate standalone
startup dashboard chat message before any subsequent tool and the continuation
into Context check. An active run continues until its documented human question,
approval, verified live-agent/background-task wait, stop or completion; do not end because code/tests pass.

The state file is authoritative. Keep existing run markers unchanged. Read
[legacy state/progress](references/orchestration/state-and-progress.md) and
[legacy transitions](references/orchestration/transitions.md) when a saved run
lacks the controller contract or its documented migration needs the old defaults;
do not load the legacy template on an ordinary new run.

## Execute the saved phase

Read the complete guide for the current phase when it begins. Load another guide
only when taking its documented route. The guides retain the existing phase
procedures; this relocation does not change inline/delegated execution placement. For an explicitly enabled `refinement_worker_version: 1` initial local Autopilot run, follow [the refinement worker route](references/refinement-worker.md) instead of reading the full close-the-gaps skill in the parent. New runs dispatch write-the-tests in a fresh worker; other stage placements remain unchanged.

| Saved phase or operation | Required guide |
| --- | --- |
| Context check, startup question, resume | [Startup](references/orchestration/startup.md) |
| Refinement, risk assessment, spec approval | [Refinement](references/orchestration/refinement.md) |
| Lightweight implementation/fix | [Lightweight](references/orchestration/lightweight.md) |
| Plan, readiness, plan approval, requirements conflict | [Planning](references/orchestration/planning.md) |
| Write Tests (`write-tests`), preparation resume/blockers | [Planning and preparation](references/orchestration/planning.md), then the worker integration contract |
| Execute, completion-gate triage | [Execution](references/orchestration/execution.md) |
| Independent review and review preparation | [Review](references/orchestration/review.md) |
| Fix planning, escalation, loop-limit handling | [Fixes](references/orchestration/fixes.md), then the relevant planning/execution guide |
| Final context sync, review-preparation documentation maintenance | [Final sync](references/orchestration/final-sync.md) |
| Final package and exact approval | [Final package](references/orchestration/final-package.md) |
| Terminal feedback, including eligible stops | [Feedback](references/orchestration/feedback.md) |
| Terminal summary and optional delivery offer/continuation | [Completion](references/orchestration/completion.md) |

For `handoff_version: 1`, read [handoffs](references/handoffs.md) before the first
stage and route validated results through the controller. Never derive completion
or routing from prose alone when a versioned handoff is required. Keep phase,
plan/review versions, loop counters, repository scope, effective autonomy and
pending approvals bound to the exact accepted artifacts.

The main session owns workflow decisions, pending human input, activity,
dashboard updates and ticket publication. Inline stages retain their current
contract. Existing implementation/fix/review delegates return their actual work
and evidence; their summaries do not supply consent or complete a workflow.
Checkpoint the delegated activity before dispatch. Reconcile actual live-agent
and returned-result evidence before resuming or redispatching interrupted work.

## Finalization

A clean review precedes final sync and packaging. Recheck coverage after final
documentation changes; changed delivery scope follows the existing review route.
Guided package approval and separate delivery authorization remain mandatory.
Run the eligible feedback procedure at its terminal checkpoint, preserve the
bounded collection/repair rules, and read the complete current saved feedback
report in the parent before presentation. Do not move feedback earlier, reopen
completed work merely for feedback, or infer approval from an agent or silence.

Read the completion guide before the terminal response. Preserve its required
links, assurance/verification qualifications, local-artifact notes and optional
delivery question. Commit/push/PR operations belong only to the separately
explicitly authorized delivery path; this workflow never performs them itself.
