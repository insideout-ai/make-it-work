# Changelog

All notable changes to `make-it-work` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.3.0] - 2026-10-06

### Added

- `implement` now records terminal-run feedback in a cumulative, anonymous, share-safe `make-it-work/implement-feedback.md` file. Minimal runs get a compact entry; runs with fix or replan rounds get an evidence-based retrospective and may ask post-terminal clarification questions when an answer would materially change the diagnosis. The file remains local and is never uploaded automatically.
- Added model-driven eval coverage for clean, non-minimal, and idempotent feedback runs.
- `implement` now escalates to a replan early, instead of burning the remaining fix cycles, when a review finding was introduced by an earlier fix, when two consecutive reviews flag the same function or file region, or when `plan-the-work`'s amend mode returns `Recommend replan:`. From the second fix round of a plan version, the fix-plan entry row also carries a one-line root-cause statement, and Guided mode asks whether to patch again, replan, or stop.
- `review-the-pr` now enumerates the state space of each changed function or path and reports every verified finding in that region in the same review. In implement-mode re-reviews, each finding carries an `Introduced by fix of: <#N | none>` field, so repeat offenders are visible.
- `plan-the-work`'s amend mode now requires a root-cause statement and a sibling-case sweep for each fix step, tests the complement of any guard a fix adds, and returns `Recommend replan:` when a fix regressed its own path or the same region was flagged in two consecutive rounds. Its replan mode now opens with a `**Design reset:**` line stating what the previous plan modeled wrongly.

### Fixed

- `implement` now checkpoints the transition into fix planning and resets the fix-round state before invoking `plan-the-work` in amend mode, keeping persisted state and dashboard recovery aligned if amend planning is interrupted.
- `implement`'s dashboard and Resume rules now handle the `fix-plan → plan` and early `review → plan` replan transitions.

## [4.2.0] - 2026-10-04

### Added

- `implement`'s dashboard now shows which stage skill backs each phase dot (e.g. `Plan (plan-the-work)`), for every phase a stage skill actually backs.
- Added a live `current_activity` field: a one-sentence, high-level description of what's currently being done, narrated in chat before any multi-tool-call stretch of work with no natural pause point, and mirrored on the dashboard under the active phase dot. Clears on a phase change and is hidden while Paused/Stopped.
- The dashboard's Fix Plan dot is now spliced into the phase timeline only once a fix-plan round actually starts, instead of always rendering as a dead placeholder slot on runs whose review comes back clean on the first pass.
- Completion now reminds the user that a ticket's `make-it-work/` artifacts are gitignored and safe to delete once no longer needed.

### Fixed

- The dashboard's masthead logo now sits on a dark backing plate, so it stays visible regardless of the source artwork's own coloring.
- Fixed the current-phase spinner ring clipping at the phase timeline's top edge.

## [4.1.0] - 2026-10-04

### Added

- Rebuilt `implement`'s per-ticket progress dashboard: a branded masthead (logo, title, autonomy pill with tooltip), a full-width layout, and a visual phase timeline that grows and folds dots to match the state file's own transition history instead of a plain phase pill. Added live step-progress and phase-duration annotations beneath the timeline's dots.
- Renamed the dashboard's Transition log to Audit log: a single, newest-first, locally-timestamped log broadened to record non-phase decisions (execution mode, autonomy level, fix-plan dispatch order) alongside phase transitions, with a completion banner whose stated duration always agrees with the Audit log's own Session-timing note, and a legacy-timestamp guard so a run resumed across this upgrade never computes a duration across a real/approximate timestamp boundary.
- `implement` now creates and announces its dashboard at the very start of a new run, immediately after the branch guard passes, instead of waiting for Context Check and Choose Autonomy to finish first.
- Added a branch guard that asks whether to create a feature branch, proceed on the base branch, or stop, instead of hard-stopping `implement` on the base branch.
- Added honest timestamp/cost handling throughout `implement`: every logged timestamp is a real captured moment, elapsed time is computed only from a real anchor, and cost is stated as unknowable rather than estimated.
- Added a one-time "stop after each step vs. run straight through" choice to `execute`'s Inline mode, with an autopilot-safe override that never lets a recorded preference hang an unattended run; Subagent-Driven mode no longer pauses between steps at all, matching its own `--autopilot` precedent.
- Added a Sequential-vs-Parallel dispatch choice to `implement`'s fix-plan rounds: a round's own added steps can now be dispatched as a genuine concurrent batch when the plan's markers and files allow it, with the orchestrating session — not individual subagents — owning the batch's progress, so a partial failure can never silently skip a step.
- Added a convention forking heavy or open-ended investigation to a fresh subagent in `close-the-gaps`, `plan-the-work`, and `implement`'s own direct investigation, instead of accumulating it inline.

### Changed

- `plan-the-work` no longer commits its red-state test files during planning; resume-ability now comes entirely from the plan and state files, not git history.
- Renamed the execute-report artifact to `<TICKET>-execute.md`, consistent with the other artifact names.
- The review-cycle limit is now derived from the fix-cycle limit (`fix_cycle` limit + 1) instead of an independently chosen constant, so the two can't drift out of sync.
- A write to the state file's Known regressions or Decided findings sections now regenerates the dashboard immediately instead of waiting for the next checkpoint.

## [4.0.0] - 2026-10-03

### Added

- Added `/make-it-work:implement`, which orchestrates the full pipeline for one ticket — context check → `close-the-gaps` → `plan-the-work` → `execute` → `review-the-pr` → final context sync — with two autonomy levels (Guided, Autonomous), saved and resumable workflow state in `make-it-work/<TICKET>-state.md`, material-change detection on resume, capped loops (3 fix cycles and 5 reviews per plan version, 2 replans per run), and a branch guard. It never commits implementation changes, pushes, or opens a PR.
- Added a per-ticket progress dashboard (`make-it-work/<TICKET>-status.html`) to `implement`, created at the start of a run and regenerated at every checkpoint from the same fields already tracked in `<TICKET>-state.md` — phase, status, autonomy, cycle counts, the transition history, and artifact links — plus a plain-language explanation of what the user needs to do next while the run is paused or stopped.
- Added a `## When run by implement` section to `close-the-gaps`, `plan-the-work`, `execute`, and `review-the-pr`, defining each stage's orchestrated inputs and return report. Standalone runs ignore it.
- Added replan and amend modes to `plan-the-work` under `implement`: replans write versioned `<TICKET>-plan-v<N>.md` files and build on the previous attempt's working tree; amend mode turns review fixes and spec-related completion-gate regressions into new test-first steps that `execute` resumes on.
- Added an `Execute outcome:` line to orchestrated `execute` runs, and an `Orchestrator outcome:` line, finding routes (`fix` / `replan` / `human`), and an uncommitted-working-tree review to orchestrated `review-the-pr` runs, which also report docs-sync gaps for the final sync instead of as findings.
- Added an end-of-run context update to `close-the-gaps` (Phase 7) and `plan-the-work` (Step 5.6) that records facts about the existing system learned during the run — never the ticket's planned behavior.
- Added `docs/autopilot-log-schema.md`, the canonical `--autopilot` decision-log schema (field shape, the `repo`-field exception, and the `[autopilot best-guess]`/`_(autopilot)_` marker convention) shared by all 10 autopilot-enabled skills.

### Changed

- `close-the-gaps` and `plan-the-work` now end with a `Context updated:` line, and may write the project's skills and `.claude/rules` files directly in their new context-update step.
- `close-the-gaps`, `define-test-strategy`, `execute`, `find-the-repos`, `go-deep`, `plan-the-work`, `review-the-pr`, `run-regression`, `shape-the-epic`, and `slice-the-epic` now point to `docs/autopilot-log-schema.md` for their `--autopilot` decision-log field shape instead of each documenting it inline; each skill's own log filename, write timing, and resolution table are unchanged.

## [3.0.0] - 2026-09-25

### Added

- Added an in-file `## Execution Status` section to `plan-the-work`'s generated plans, tracking the chosen execution mode and per-step progress so a plan resumed in a fresh session no longer has to guess or improvise an execution strategy.
- Added a plain-language `## What This Changes` section to `plan-the-work`'s generated plans, and an explicit no-code/no-file-path constraint on `## Approach`, so a non-implementer can follow the plan without opening Affected Code or Steps.
- Added before/after-mitigation overall risk scoring to `plan-the-work`'s `## Risks` section, plus a required phasing-alternative subsection when residual risk stays High.
- Added a `## Decision Log` section to both `close-the-gaps` and `plan-the-work`, recording every question asked during their interactive Q&A and how it was resolved.
- Added dependency-ordered, batched `AskUserQuestion` calls (up to 4 questions per wave) to `close-the-gaps` and `plan-the-work`'s interactive Q&A, replacing one-question-at-a-time asking where questions don't depend on each other's answers.
- Added a post-commit pipeline-artifact cleanup check to `go-deep`'s generated `CLAUDE.md`, reminding the user to remove a ticket's stale `make-it-work/*.md` files once its code is committed.

### Changed

- **Breaking:** renamed `/make-it-work:plan` to `/make-it-work:plan-the-work` to avoid colliding with Claude Code's own built-in `/plan` mode.
- **Breaking:** standardized pipeline-artifact file names on the ticket-first convention already used by `close-the-gaps`: `plan-the-work` now writes `make-it-work/<TICKET>-plan.md` (was `plan-<TICKET>.md`), and `review-the-pr` now writes `make-it-work/<TICKET>-review.md` (was `code-review-{TICKET}.md`).

## [2.1.0] - 2026-09-18

### Added

- Added `/make-it-work:plan`, which turns a refined spec into an execution-ready implementation plan grounded in the affected repositories.
- Added support, security, and contribution guidance.
- Added structured bug-report and feature-request forms plus a pull-request template.

### Changed

- Expanded the plugin and marketplace metadata to cover the complete SDLC workflow and improve discovery.
- Expanded installation, update, permissions, workflow, and troubleshooting documentation.
- Standardized the `close-the-gaps` saved-spec path as `make-it-work/<TICKET>-spec.md` for use by `plan`.

## [2.0.0] - 2026-09-18

### Added

- Added `/make-it-work:review-the-pr` for documentation-grounded pull-request review.

### Changed

- Renamed the former code-review workflow to `review-the-pr`.
- Strengthened plugin validation and interactive workflow guidance.

### Removed

- Removed the `close-my-loops` skill from this plugin.

[3.0.0]: https://github.com/insideout-ai/make-it-work/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/insideout-ai/make-it-work/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/insideout-ai/make-it-work/releases/tag/v2.0.0
