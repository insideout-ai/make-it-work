# Changelog

All notable changes to `make-it-work` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.1.0]: https://github.com/insideout-ai/make-it-work/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/insideout-ai/make-it-work/releases/tag/v2.0.0
