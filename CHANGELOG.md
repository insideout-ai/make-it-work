# Changelog

All notable changes to `make-it-work` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Chat autonomy changes in `implement` now queue for the next phase. The active phase and open questions/approvals retain their original mode; later requests replace or cancel the queue. Saved state and the dashboard distinguish effective and queued modes, and the phase transition audits application without retroactive approval or guessed answers.
- `implement` now chooses its workflow by risk. After `close-the-gaps`, new runs assess the ticket as Low, Medium or High risk with a recorded rationale. Low risk runs **Lightweight**: a fresh subagent implements the spec directly, with no plan, test-first steps or regression gate, and the independent review and final context sync remain mandatory. Medium and High risk keep the full TDD pipeline. A Lightweight run escalates once to TDD on repeat or same-area review findings, a product decision, a replan-level finding or new risk, keeping its code as the TDD plan's accepted baseline; it never downgrades on its own. `--mode lightweight|tdd` or a chat request forces a mode while the assessment is still recorded. Guided spec approval shows the risk, mode and rationale and can switch mode; Lightweight runs have no plan gate. The state, dashboard, final package and workflow feedback record risk, mode, escalations and skipped stages. Runs started before this change resume under the full workflow without assessment.
- The `implement-autopilot-full`, `implement-no-tooling` and `implement-empty-strategy` evaluations and the end-to-end rehearsal pass `--mode tdd` so their small tickets still exercise the full TDD pipeline.
- PM refinement messages in Slack now use a welcoming greeting, link to the Jira or other tracker ticket when its URL is available, explain how to reply in the thread, and include a short AI disclosure crediting make-it-work by InsideOut AI.

### Added

- Test-map entries now record strategy layer labels, with Unknown for unclassified or older entries. A portable generator produces root `TEST-MAP.md` with layer counts, feature behaviors, unresolved mappings and a collapsed evidence catalog. Onboarding/planning/implementation regenerate it after saving maps; read-only workflows remain unchanged. Explicit `--write` and `--check` modes support developer refreshes and drift detection without changing JSON or running tests.

- Deterministic skill helpers now own new implement-run transitions/counters/snapshots, evidence-bound execution progress, regression command results, structural plan checks, fixed autonomy choices, offline question conditions, documentation inventory, strategy consistency/pointers, slice graphs/artifacts, epic rendering, bounded repo evidence collection, and review report/handoff projection. Legacy runs retain their existing opt-in boundaries. Focused disposable-fixture tests and CI cover the helpers; semantic product/design/coverage judgments and external-write authorization remain with their existing owners.
- New `implement-lightweight-run` and `implement-escalation` evaluations cover a Low-risk run completing through Lightweight and a repeat review finding escalating a Lightweight run to TDD.
- The initial refinement choice now separates **Answer here**, **Draft in Slack**, and **Send via Slack**; standalone `close-the-gaps` also retains **Export to a file**. `--slack` remains draft-only and new `--slack-send` explicitly authorizes sending to the confirmed PM. Saved delivery metadata supports reply lookup and prevents automatic resends after interruption or an uncertain result; `implement` reports the actual delivery status and pauses for answers.
- `implement` now requires every explicit user workflow decision in its Audit log and dashboard, including tracker permission scope and revocation, Slack selection, approvals, execution preferences, resume choices and delivery decisions. A shared checkpoint captures the host timestamp, preserves changed-choice history and prevents duplicate events on retry. Automatic defaults remain distinct from user approval.

### Fixed

- Final Sync bounds test-map semantic review to affected evidence, separates pre-existing incomplete onboarding from feature changes, uses compact subagent inputs and reuses completed validation unless its assumptions or selection change. Partial maintenance retains unresolved scope and existing baselines rather than claiming a full refresh.
- Questions and approvals now checkpoint pending-input records before asking, with blocking waits marked Paused and optional decisions allowed to coexist. The HTML shows the actual question, choices, recipient, artifact/hash and elapsed wait, and keeps refreshing through resolution. Answers, resume, mode changes and stale exact approvals use the saved request identity; post-completion delivery retains Complete.

- Resume distinguishes phase-independent decision rows from choices made during unfinished work. Post-completion audit entries retain implementation completion timing, and decision prose cannot inflate feedback review counts.

## [4.19.1] - 2026-10-28

### Fixed

- `implement` resolves autonomy before asking where refinement questions should go, so either Autopilot choice skips the destination prompt.
- Lightweight dashboards hide Plan and Execute artifact cards. Dashboards omit cycle counters, and audit outcomes and timeline tooltips omit internal workflow event IDs and hashes; saved records retain counters and retry metadata.
- Dashboards hide empty exception sections and label populated ones Unrelated test failures and Review decisions; saved state headings and entries remain unchanged.
- Selecting Prepare delivery continues `deliver` inline, prepares and displays the full delivery plan, and waits for exact-plan approval without requiring a manual command or repeated opt-in. Behavioral eval cases cover preparation, decline and stale-package failure.

## [4.19.0] - 2026-10-28

### Added

- `drive-the-epic` orchestrates ideas, documents, or Jira tickets through requirement shaping, complete-epic review, and slicing, with interactive/autopilot modes, resumable state, and an HTML process dashboard. Its handoff prepares individual slices for separate `implement` runs; automatic implementation coordination remains a future phase.
- Four behavioral evals cover autopilot preparation, the interactive review gate, scoped revisions, and inaccessible Jira sources.

### Changed

- Epic orchestration uses short artifact names: `requirement.md`, `slicing-summary.md`, and stable slice IDs with short descriptions. Revisions receive `-v2`, `-v3`, and later suffixes while preserving previous artifacts and updating links.
- New orchestration runs retain source evidence, stage inputs, and decisions in one state file; successful transient event input is removed instead of accumulating per-event JSON and duplicate logs.
- The epic dashboard shares implement styling and shows two primary artifacts followed by a newest-first decision audit, compact status banners, and unwrapped From/To labels.
- The optional pre-push hook accepts `MIW_SMOKE_CASES` to run explicitly selected relevant smoke cases; its default remains the complete smoke suite.

## [4.18.1] - 2026-10-27

### Fixed

- Active workflow phases always show an activity box, with an explicit fallback when details have not been reported. Activity checkpoints save a Last updated timestamp, clear it at phase/pause/stop boundaries, and carry reporting through inline stages, testing readiness and subagent waits without letting delegated agents overwrite the dashboard.

## [4.17.0] - 2026-10-25

### Added

- `close-the-gaps --slack` sends gap-analysis questions to the ticket's Product Manager: it confirms the PM derived from the ticket, creates a **draft** direct message in your own Slack (never sent for you), saves the usual questions file, and stops. Re-invoking with that file reads the PM's thread replies, asks you live about unclear or missing ones, and reports a draft that was never sent or an unanswered thread with a choice to wait or answer live. When Slack can't be used, it falls back to the offline file. `--slack` and `--offline` are mutually exclusive.
- Without a mode flag, `close-the-gaps` asks once the questions are known whether to answer here, export to a file, or send to the PM in Slack. Autopilot always answers here; `--slack --autopilot` accepts the ticket-derived PM without confirmation.
- `implement` offers Slack refinement at its start in Guided and Autonomous runs when Slack is available. A new `QUESTIONS_SENT` gaps handoff pauses the run as `Slack refinement pending`; Resume re-enters `close-the-gaps` with the questions file. Autopilot never uses Slack.
- New `close-the-gaps-slack-fallback` evaluation covers the no-Slack fallback.

## [4.16.1] - 2026-10-24

### Changed

- `go-deep` presents review checkpoints as complete written reviews and waits for a chat reply. Scope reviews include the full domain and use-case tables; the project documentation review explicitly names `CLAUDE.md`, `product.md`, and `architecture.md`. Discovery questions continue using the question tool.
- `go-deep` explains findings, the requested decision, and next actions around user questions. Added small and large scope-review regression cases checking visible review content and the approval pause.
- `close-the-gaps` includes an "As a…, I want…, so that…" user story in each refined spec, preserving existing stories and listing unresolved parts as TBD.

## [4.16.0] - 2026-10-22

### Changed

- Test mapping is non-intrusive for every placement: onboarding maintains shared `.claude/testing/test-map.json` beside the strategy skill without editing source/tests, comments or filenames. Older setups regenerate strategy/map metadata from current evidence; there is no tag importer, old-rule conversion or automatic cleanup.
- Planning, execution, gate triage and review consume evidence-backed index relationships. Lightweight Git-aware freshness checks reuse unchanged mappings and reassess changed tests/dependencies, with conservative rediscovery for unknown impact. Standalone regression/review and report-only requests refresh in memory; change workflows save reviewed metadata updates. Full-suite scope and gate policy are unchanged.
- A read-only Node helper, shared contract, lifecycle tests and focused evaluations cover fresh onboarding, cross-repo identities, freshness, partial discovery and user decisions.

### Fixed

- Test-map evidence distinguishes documented behavioral domain relationships from directory-only inference; headless graders retain loaded skill text when judging that evidence.
- Story-slicing autopilot presents all approach previews and example slice titles in chat before generating the backlog, rather than only recording its choice in the deliverable.
- Test-map freshness supports safe in-repo symlinks and explicitly referenced Git-ignored tests, configuration and evidence without scanning unrelated ignored files. Final context sync reconciles mappings after documentation edits and before packaging/completion.

## [4.15.0] - 2026-10-22

### Added

- Eligible tracker-ticket runs offer **Autopilot + update ticket** alongside plain Autopilot. The combined choice saves explicit publication consent without a second prompt; both retain the same Autopilot execution mode.
- A separate dashboard permission badge shows **Ticket updates: Allowed / Off / Unknown** from the validated run journal, with the granted scope in its tooltip. Revocation and autonomy changes refresh it without conflating permission with publication success.
- Missing attachment tools no longer prevent authorized artifact publication: accepted specs/plans can fall back to readable comments, with review and verification summaries in the completion comment. Saved fallback consent is explicit and compatible with older journals; uncertain writes and successful publications are checked across both formats to prevent duplicates.
- `implement` offers ticket publication once for an explicitly supplied tracker ticket: description replacement with the accepted refined spec, finalized plan attachments, and significant blocker/completion comments. Comments-and-attachments-only and local-only choices are available; consent is scoped to one ticket/run, persists on resume and remains independent of autonomy and delivery approval. Autopilot defaults to local unless the user explicitly authorized updates.
- A local publication journal preserves the original description, checks for concurrent edits, records confirmed remote IDs, skips successful duplicate updates, and defers ambiguous writes for read-only reconciliation. Connector failures retain local artifacts and do not change implementation status. Focused tests/evaluations cover scope, resume, concurrency and partial support.

### Changed

- Completed implementation stages show only their checkmark, stage/skill label and duration in the dashboard timeline. Approval/publication explanations and completed fix-step progress remain in the audit log instead of repeating under the circles.
- The implementation dashboard shows the full current activity once inside the blue box. Removed the duplicated Activity details disclosure and two-line truncation, so refreshes cannot hide the activity text.

## [4.14.0] - 2026-10-20

### Changed

- `implement` accepts "switch to Guided", "switch to Autonomous", and "switch to Autopilot" in the active Claude Code chat. Changes apply at safe checkpoints, preserve progress and audit history, refresh existing dashboards, and persist on resume. Inline stages and nested regression use the current mode rather than a stale startup flag; pending approval gates follow the new policy without treating the switch as approval or a missing product answer.
- Test tagging now applies to separate test files, including colocated files. Embedded tests and executable documentation examples use evidence-backed module/behavior mappings without new tags. Strategy generation, planning, regression selection and PR review distinguish explicit, inferred and unresolved mappings; embedded runs use supported selectors and disclose any broader enclosing scope. Existing embedded tags are left untouched.
- The implementation dashboard keeps its logo and connected progress circles while showing current activity in a shared row below the timeline, with a two-line summary and expandable details. Tighter spacing and multi-column artifact tiles keep Artifacts and Audit log higher in IDE panels. Timeline skill names always start on a separate line beneath their phase names.

## [4.13.0] - 2026-10-20

### Added

- `define-test-strategy` discusses repo-specific test layers, boundaries, coverage priorities, execution and adoption before saving the strategy. It distinguishes current coverage, target coverage and the first adoption phase, asks focused questions with recommendations and tradeoffs, and records decision sources, assumptions and deferred risks. Autopilot resolves and logs defaults while preserving explicit user choices; coverage-report-only skips the discussion.
- Focused evaluations cover no-tooling proposals, existing runners without tests, mixed React/Deno applications, interactive scope decisions, coverage-only runs, refresh of saved layer selections and planning with a required layer awaiting setup.

### Changed

- Generated strategies list every configured or selected layer in `Layers`, `Where New Tests Go` and `Coverage Decision Guidance`, with `configured`, `planned` or `deferred` status and explicit prerequisites. Intended test destinations can be recorded before directories or tooling exist; runnable commands and `Test Locations` continue to reflect actual configuration.
- Strategy refresh upgrades old configured-only tables using saved user decisions. A consistency check prevents selected layers from disappearing, and verified setup promotes only the established layers while preserving other planned/deferred choices.
- Planning and implementation readiness identify missing setup for required selected layers even when another test runner is configured. Regression runs use configured commands, and older strategies without status columns retain their previous interpretation.
- Strategy recommendations treat missing tooling as a prerequisite to discuss, keep production refactoring separate from setup, and avoid testing detached copies of production logic as a substitute for backend coverage.

## [4.12.0] - 2026-10-19

### Added

- `slice-the-epic` offers 2–3 tailored slicing approaches with a recommendation and waits for the user's selection. It saves all stories in a Markdown file with stable slice IDs, a Mermaid dependency map, a relationship table, and staged implementation guidance identifying prerequisites, parallel work, and a proposed MVP boundary.

### Changed

- The implementation dashboard now follows the separate delivery workflow through approval, running, partial failure and completion using its delivery journal. Delivery checkpoints refresh existing HTML, expose per-repo commit/PR links and actual push results, retain implementation timing/Complete status, and remove stale uncommitted claims. Older journals can be displayed without rerunning delivery.
- Repos without test tooling receive a repo-specific proposed setup from `define-test-strategy`. New `implement` runs resolve testing readiness before planning, configure a minimal verified setup by default in Autonomous/Autopilot, or retain explicitly selected manual verification. Plans record per-repo verification policies; execution, review and final packages preserve actual automated/manual evidence, with `VERIFIED_MANUALLY` available for fully verified all-manual plans and no automatic downgrade of an unavailable automated gate.
- Story-slicing autopilot selects and logs the recommended technique, preserves explicit user choices, and flushes its decision log after delivering the saved backlog.
- `go-deep` uses numbered question-tool checkpoints for scope, documentation foundations, sample skills, and final acceptance, with approval, revision, and pause choices. Repair confirmations use the same interaction; unanswered prompts remain pending, and hosts without a permitted question tool receive an explicit confirmation prompt. Autopilot keeps its existing resolution and decision-log behavior.
- Fresh onboarding creates domain skills with stable numbered names such as `domain-01-authentication`, assigns IDs before parallel creation, and carries them through documentation tables and cross-references. Existing repositories keep their naming convention without migration or renaming; generated `CLAUDE.md` instructions preserve that convention when future feature work adds domains.
- Updated go-deep documentation and eval criteria for the checkpoint interaction, numbered domains, and repairs of existing unnumbered skills.

## [4.11.0] - 2026-10-17

### Added

- `evals/run-suite.mjs` takes optional `--model=ID` and `--judge-model=ID` flags, so every case and every semantic grader can run on a model the account can use.
- `scripts/decision-log.mjs` accepts `--input <file>` for shells that refuse the inline-JSON heredoc; the payload file is read, then deleted.

### Changed

- `define-test-strategy` is now a per-repo onboarding step after `go-deep` that takes an optional `[repo]` argument and offers to run `go-deep` first. It writes the repo's `.claude/skills/test-strategy/SKILL.md` — test locations across repos (such as a QA repo), commands, run prerequisites, and where new tests go — adds repo-qualified `@covers` comment tags to existing tests, uncommitted, adds one `/test-strategy` row to the `CLAUDE.md` Other Skills table, and reports coverage from a live tag scan. Projects onboarded with an older version must re-run `define-test-strategy` to migrate; until they do, consumers ignore the old `.claude/rules/testing-strategy.md` and scoped regression runs are unavailable.
- `run-regression` takes repo-prefixed tokens (`<repo>:UC-<id>`, `<repo>:domain-<name>`) for several repos in one call, plus `full:<repo>`, under one overall gate result. It finds tagged tests by grepping `@covers` comments across every test location, and reports suites that can't run locally, or repos with no tests, as not run rather than failed. A bare `full` still runs only each repo's own suite.
- `plan-the-work` writes new tests where the test-strategy skill says, tagged with `@covers`, adds a repo that only receives tests (such as a QA repo) to Affected Code as `(test scope only)`, and records the plan's tokens in a new `## Domains/UCs Touched` section.
- `execute`'s completion gate runs the plan's tagged tests plus the full suite of every product repo it changes, recorded as `scoped+full`, and falls back to the full suite when the plan has no tokens or no strategy; its report lists suites that were not run.
- `implement` triages gate failures using the plan's `@covers` tokens, warns (without stopping) when a repo has no test-strategy skill or only the old rule file, accepts the `scoped+full` gate in its state, handoffs, ledger and dashboard, and branches and packages a test-scope repo with the product repos when it has changes.
- `review-the-pr` reports a new or changed test with no `@covers` tag for a touched use case or domain, and a touched one left with no tagged test, as Minor findings.
- `go-deep` keeps the `CLAUDE.md` Other Skills table on fresh onboarding and ignores its rows and the test-strategy skill in repair checks.
- `define-test-strategy` and `go-deep` write files only with the Write and Edit tools. When a `.claude/` write is blocked they keep going and report the blocked paths; `define-test-strategy` prints the generated skill verbatim, keeps the old rule file and leaves `CLAUDE.md` unchanged. A repo with a test script but no tests yet records its command instead of the `none` row, and the go-deep warning covers test-only repos.
- `run-regression` finds repo directories by matching a file inside them, so read-only runs detect sibling repos and prefixed repos reliably.
- `find-the-repos` keeps a row for repos absent on disk, tiers README-only repos as No match rather than Excluded, treats a repo whose state the acceptance criteria constrain as Possible, and limits terminal output to the table, a report link and a fixed confirm prompt.
- `slice-the-epic` lists non-blocking open details as Open questions rather than assumptions; `shape-the-epic` writes each KPI as a list item and uses the decision-log `--input` fallback when the shell refuses the heredoc.
- Headless eval cases grade either the written or the blocked `.claude/` outcome, since headless runs can't write there. Semantic graders reason before their verdict, take the best two of three votes, and retry a crashed judge once.

### Removed

- `define-test-strategy` no longer scaffolds placeholder tests, adds a regression-check item to the `CLAUDE.md` "After Any Feature Change" checklist, or offers a git hook. Path-based (file-name) UC/domain tagging is replaced by `@covers` comments.

## [4.10.0] - 2026-10-15

### Added

- `shape-the-epic` offers Product and Technical-debt modes, with mode-specific categories, acceptance criteria, and output sections.
- Interactive epic shaping supports category selection through two multi-select questions; the discovery interview and gap-check focus on those selections, while unselected categories are marked Not assessed.

### Changed

- Epic shaping preserves the discovery interview and generates the complete draft directly afterward for consolidated feedback, removing the category-by-category content approval round.
- Technical-debt epics center on outcome-based acceptance criteria, evidence, verification, and scope boundaries. Ownership is outside the skill's scope; material agreed technical constraints and external dependencies are optional, and implementation planning is deferred unless explicitly requested or essential to an agreed constraint.
- Epic-shaping guidance is split into shared workflow and mode-specific references. Autopilot retains bounded discovery and post-deliverable decision logging, defaults to all categories when no subset is supplied, and logs checkbox selections as arrays without section-approval entries.
- `find-the-repos` drills into relevant domain/use-case skills and runs bounded code searches in every candidate, including repos without `product.md`. Shortlists include evidence pointers, assessment methods, possible existing implementation, and ticket-named external systems; concept-specific cross-repo references can extend discovery while generic service links cannot.
- Repo routing now starts with an exact implementation check and leads the report with verify-and-finish findings. It accepts catalog/workspace grouping signals, combines missing scope/ticket intake, distinguishes primary and related ticket keys, and reports owner-source conflicts and external coverage gaps.
- Repo routing assesses all repos in the resolved workspace by default, including large sibling-repo folders without grouping metadata. AskUserQuestion is reserved for genuine workspace ambiguity or explicit narrowing, not a mandatory repo-selection round; missing ticket content is requested directly.
- Repo routing maintains one `<TICKET>-repos.md` file through review, comments, and confirmation, updating its status in place instead of creating draft/final copies. Terminal summaries contain only a Definite-repo table with owner identifiers and supporting evidence types; full evidence, other tiers, ownership provenance/conflicts, and handoff details stay in the report.

## [4.9.0] - 2026-10-14

### Changed

- `implement` asks for autonomy before the branch decision. Choosing Autopilot interactively now creates the suggested branch without another prompt; choosing the suggested branch in Guided or Autonomous creates it immediately, while a separate choice accepts a custom name.
- After a package-enabled run completes, `implement` asks whether to prepare delivery even in Autopilot. Delivery remains a separate workflow and still requires approval of its exact plan before committing, pushing, or creating a PR.
- The dashboard shows Deliver as an optional step after Complete, keeps the final package in the artifact grid, shortens the completion banner, and gives cumulative workflow feedback its own note.

## [4.8.0] - 2026-10-11

### Added

- `implement` offers `deliver` as an optional final step, including in the completed HTML dashboard; delivery still requires separate approval.

### Changed

- New ticket runs save their spec, plan, state, dashboard, handoffs, verification, review, final package, delivery, and ticket-scoped decision logs under `make-it-work/<TICKET>/`. Existing flat artifacts are left in place and are not discovered by the new layout.
- The dashboard refreshes during active runs and flags audit timestamps later than the state checkpoint; eval fixtures and graders use the ticket-scoped layout.

## [4.7.1] - 2026-10-09

### Fixed

- Tightened skill instructions for ticket refinement, test strategy, execution, implementation feedback, PR review, epic shaping, and story slicing after regression findings.
- Corrected eval prompts and graders that could misclassify valid workflow output, and added feedback-writer validation tests.

## [4.7.0] - 2026-10-08

### Added

- Added an `implement` dashboard checkpoint helper that keeps activity and step progress synchronized with the rendered status page, with rollback on render failure.
- Added multi-case selection and argument tests to the local eval runner for bounded targeted regressions.

### Changed

- Autopilot decision logs now live under `make-it-work/` rather than `.claude/`; skill instructions, the shared writer, documentation, and evals use the same location.
- `implement` feedback preserves the run's plugin version and records terminal outcomes more consistently.
- Review, ticket-refinement, and regression-stop instructions make required reports and stop messages explicit.
- Eval grading handles headless `implement`, zero-tool cases, cross-file evidence, and legitimate fixture variations without relying on manual review or brittle LLM judgments where deterministic checks suffice.

## [4.6.0] - 2026-10-08

### Added

- New `implement` runs use validated, versioned stage handoffs and a transition helper; older runs retain their original routing.
- A content-bound final approval package shows the exact diffs, validation and review evidence, remaining caveats, and draft delivery text. Guided approval is invalidated by later changes.
- Added the separate, explicitly approved `/make-it-work:deliver` command to commit, push, and create or update GitHub or Bitbucket Cloud PRs without changing `implement`'s uncommitted default.
- Execute now records per-step verification, the existing completion gate result, and AC evidence in a durable ledger for new runs; Review and the final package use it without adding another validation phase.

### Changed

- CI runs all `implement` helper tests, and the smoke inventory covers the new public delivery skill.
- `define-test-strategy` now keeps its added regression checklist item numbered from `1`; its smoke grader checks the required behavior without requiring a specific label.
- `shape-the-epic` now explicitly flushes complete autopilot decisions through the shared log writer after saving the epic; its smoke grader accepts the documented write paths and checks the decision payload.
- Smoke now automatically grades headless cases with local checks and tool-free semantic judges, reporting only pass or fail; missing judge results fail closed instead of requiring routine manual review.

## [4.5.0] - 2026-10-07

### Added

- Added `/make-it-work:implement --autopilot`, an unattended ticket pipeline that forwards autopilot mode through refinement, planning, execution, regression, and review; it creates a ticket-named feature branch from the base branch, records orchestration decisions, and stops safely when required facts are missing or contradictory.
- Added a shared, schema-validating autopilot decision-log writer for all autopilot-enabled skills, with atomic init/append/replace operations and tests; each skill retains its existing log timing and permission behavior.
- `plan-the-work` and `execute` now use a deterministic script for the plan's `## Execution Status` bookkeeping: setting the step total, recording Mode and Inline pause mode, advancing verified progress, and correcting mistaken progress claims without hand-editing Markdown.
- `implement` now uses a deterministic feedback writer to count audit-log events, format minimal and non-minimal run blocks, and safely replace the matching run while preserving other feedback and user-authored text. Retrospective diagnosis and share-safe paraphrasing remain model-driven.

## [4.4.0] - 2026-10-07

### Added

- Added a deterministic `implement` dashboard renderer and HTML template, with tests for workflow states, timing, artifact paths, and safe output handling. The skill now updates its dashboard by running the renderer from its state file.
- Added a reusable eval environment wrapper that temporarily isolates symlink-containing Docker configuration and works around the macOS Git shim for Bash-granted evals. The `implement` and `run-regression` runners use it.

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
