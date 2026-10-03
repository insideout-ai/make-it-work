# Changelog

All notable changes to `make-it-work` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `/make-it-work:implement`, which orchestrates the full pipeline for one ticket — context check → `close-the-gaps` → `plan-the-work` → `execute` → `review-the-pr` → final context sync — with two autonomy levels (Guided, Autonomous), saved and resumable workflow state in `make-it-work/<TICKET>-state.md`, material-change detection on resume, capped loops (3 fix cycles and 5 reviews per plan version, 2 replans per run), and a branch guard. It never commits implementation changes, pushes, or opens a PR.
- Added a per-ticket progress dashboard (`make-it-work/<TICKET>-status.html`) to `implement`, created at the start of a run and regenerated at every checkpoint from the same fields already tracked in `<TICKET>-state.md` — phase, status, autonomy, cycle counts, the transition history, and artifact links — plus a plain-language explanation of what the user needs to do next while the run is paused or stopped.
- Added a `## When run by implement` section to `close-the-gaps`, `plan-the-work`, `execute`, and `review-the-pr`, defining each stage's orchestrated inputs and return report. Standalone runs ignore it.
- Added replan and amend modes to `plan-the-work` under `implement`: replans write versioned `<TICKET>-plan-v<N>.md` files and build on the previous attempt's working tree; amend mode turns review fixes and spec-related completion-gate regressions into new test-first steps that `execute` resumes on.
- Added an `Execute outcome:` line to orchestrated `execute` runs, and an `Orchestrator outcome:` line, finding routes (`fix` / `replan` / `human`), and an uncommitted-working-tree review to orchestrated `review-the-pr` runs, which also report docs-sync gaps for the final sync instead of as findings.
- Added an end-of-run context update to `close-the-gaps` (Phase 7) and `plan-the-work` (Step 5.6) that records facts about the existing system learned during the run — never the ticket's planned behavior.

### Changed

- `close-the-gaps` and `plan-the-work` now end with a `Context updated:` line, and may write the project's skills and `.claude/rules` files directly in their new context-update step.

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
