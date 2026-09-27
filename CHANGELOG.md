# Changelog

All notable changes to `make-it-work` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
