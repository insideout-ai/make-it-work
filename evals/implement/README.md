# Implement feedback evals

## Workspace implementation cases

- `implement-workspace-approval`: fresh Autopilot at a root with no `.git` or
  `CLAUDE.md`; assess via find-the-repos and wait at the combined exact repo/branch
  approval without branch mutations or workflow initialization.
- `implement-workspace-complete`: resume a synthetic explicitly approved api/web
  selection, with `main` and `develop` bases, then complete TDD, independent review,
  final sync and packaging while leaving the unrelated repo untouched.
- `implement-workspace-single-impact`: the same workspace with only api approved;
  web source and its develop branch must remain unchanged.

All three fixtures seed only disposable directories. The two continuation fixtures
record synthetic user consent during setup; they do not test live approval-message
delivery. The first case tests that Autopilot does not invent that consent.

The shared discovery, exact approval, branch-collision/stale-preview/partial-failure,
scope expansion and omission protections have deterministic tests in
`scripts/workspace.test.mjs` and `skills/implement/scripts/workspace-scope.test.mjs`.
`workflow-integration.test.mjs` executes actual red/green assertions across two repos
through final packaging, alongside the existing single-repo Guided/Autonomous runs.
Its clean review artifact is supplied by the test; semantic independent review is
part of the model-driven cases, not established by that deterministic integration.

Validation during implementation: all 365 script/workflow tests and all 37 eval
harness tests passed; all three workspace fixture variants seeded successfully and
the eval tree/dry-run validated.

Live validation on 2026-11-06 passed all 13 smoke cases (reported usage $4.24 of
the approved $12 cap) and all three selected workspace cases (reported usage $9.21
of a separate $12 cap). Both runners recorded `repoUnchanged: true` and no budget
stop. Reports:

- `evals/results/smoke-2026-11-06T09-10-43-281Z/summary.json`
- `evals/results/full-2026-11-06T09-16-20-921Z/summary.json` (the three selected
  workspace cases, not the entire full suite)

Independent read-only checks confirmed that both completed final packages were
current, the cross-repo package used api/main and web/develop, and the single-impact
package contained only api. Unselected repositories retained clean working trees
and their original branches. No fixture implementation commits were created.
Browser visual QA remains unavailable because no browser is connected; automated
HTML checks cover displayed scope, proposals, evidence and escaping.

After an approved model budget, run:

```sh
node evals/run-suite.mjs full --case=implement-workspace-approval --case=implement-workspace-complete --case=implement-workspace-single-impact --max-cost-usd=12
```

These cases resume a seeded `implement` run at `final-sync`, allowing the terminal feedback hook to be exercised without replaying refinement, planning, execution, and review.

- `feedback-clean` verifies the compact entry for a minimal completed run.
- `feedback-nonminimal` verifies Audit-log-based counting, retrospective analysis, skill attribution, share-safe output, and subagent dispatch after counters have reset.
- `feedback-idempotent` verifies replacement of the matching run block while preserving older runs and user-authored text.
- `implement-final-sync-map` resumes final sync with a current native map and a domain/product documentation gap. It checks evidence reassessment after the final doc edits, persisted current baselines, preserved user confirmation, and unchanged source/tests. Run with `node evals/run-suite.mjs full --case=implement-final-sync-map` after approving a model budget; authoring/seeding the case alone is not a live pass.
- `implement-final-sync-partial-map` starts with empty snapshots, incomplete onboarding, an affected unindexed policy test and unrelated privacy mappings. It checks bounded semantic maintenance, preserved unrelated entries/decisions and baselines, honest unresolved scope/reporting, no extra test execution and Complete without full onboarding repair. Run both mapping cases with `node evals/run-suite.mjs full --case=implement-final-sync-map --case=implement-final-sync-partial-map --max-cost-usd=6`; local fixture/grader checks are not live model passes.
- `implement-autopilot-full` starts from `main` with `--mode tdd` and verifies the unattended implementation path creates a feature branch, records autopilot state/logging and the user-forced TDD mode, implements the requested policy, and reaches a clean terminal state before the optional delivery offer.
- `implement-no-tooling` starts without a test strategy, tests or configured command, forcing `--mode tdd` because the small ticket would otherwise likely be assessed Low risk and skip readiness. It checks readiness/setup before planning, a real baseline behavior test, strategy generation, retained setup changes, and automated implementation/gate completion.
- `implement-empty-strategy` starts with an existing generated `none` strategy and also forces `--mode tdd`. It checks activation after verified setup rather than keeping stale facts through refresh, while preserving an unrelated user-written Team note.
- `implement-lightweight-run` starts a fresh Autopilot run on a one-line typo fix without `--mode`. It checks the run is assessed Low risk and completes through Lightweight: `adaptive_version: 1`, `mode: lightweight`, no plan file, a Lightweight report and `implement` handoff, a clean independent review, and `status: Complete`.
- `implement-escalation` resumes a seeded Guided Lightweight run at review cycle 2, whose saved handoff reports a repeat offender (`#2` introduced by the fix of `#1` in the same region). It checks the run escalates to TDD instead of another Lightweight fix: an `Escalation:` Audit-log row, `mode: tdd`, `escalations: 1`, reset review/fix counters, an initial-mode plan built on the Lightweight baseline, and unchanged `replans_used`/`plan_version`. The fixture verifies with the handoff helper that the seeded review routes to `escalate` and that the dashboard renders. It stops at Guided plan approval.

Seeded fixtures without `adaptive_version` are older runs and keep today's full TDD workflow; they need no `--mode` flag.

Run the adaptive cases with the signed-in headless runner:

```sh
node evals/run-suite.mjs full --case=implement-lightweight-run --case=implement-escalation --max-cost-usd=8
```
- `implement-switch-to-guided` queues Guided during an existing Autopilot Execute phase. The unavailable completion gate retains Autopilot behavior and stops without applying the queue or truncating prior logs.
- `implement-switch-to-autopilot` queues Autopilot while a Guided refinement wave is already pending without policy metadata. The exact question wave and effective Guided mode remain Paused for human answers, and the dashboard explains the queued change without fabricating defaults.
- `implement-resume-changed-autonomy` resumes saved Autopilot without a flag after a trailing mode-change Audit-log row, preserving its history and completing the older run without schema backfill.
- `implement-publication-guided-approval` resumes Guided spec approval with saved ticket-write consent. It checks that consent does not approve the spec or publish a draft, and that the offer is not repeated.
- `implement-publication-resume` resumes Autopilot with comments/attachments-only consent, a confirmed attachment and an uncertain completion-comment request. It checks local completion, preserved receipts/uncertainty, no duplicate writes and accurate publication reporting when the connector is unavailable. Both publication cases use a reserved `example.test` destination and forbid live tracker calls.
- `implement-delivery-prepare` continues a completed Autopilot run after the user selects Prepare delivery. It requires inline delivery preparation, the full preview and plan hash, and a pending exact-plan approval without execution. `implement-delivery-decline` checks Not now declines without preparation; `implement-delivery-stale` requires an actual preparation attempt and an honest stale-package stop without rebuilding. All three preserve Complete and use a GitHub-shaped origin rewritten to an empty local bare remote. They do not contact live hosting services.

Run the delivery continuation cases with `node evals/run-suite.mjs full --case=implement-delivery-prepare --case=implement-delivery-decline --case=implement-delivery-stale --max-cost-usd=6`. Fixture/ grader tests validate the local setup and artifact checks; they do not establish a live model handoff pass. Interactive selection timing remains a manual check.

Run the publication cases with the signed-in headless runner:

```sh
node evals/run-suite.mjs full --case=implement-publication-guided-approval --case=implement-publication-resume --max-cost-usd=6
```

The publication journal's deterministic tests cover explicit consent versus defaults, comments-only scope, partial connector capabilities, authorized comment fallback when uploads are missing, cross-format deduplication and uncertain-write blocking, original-description preservation, concurrency checks, approved baseline reconciliation, duplicate suppression, revised plan snapshots, permission revocation, ambiguous writes and explicit retries:

```sh
node --test skills/implement/scripts/ticket-publication.test.mjs
```

For a manual connector rehearsal, use a disposable tracker issue: allow updates, approve the spec and plan, and verify the remote description/attachment match those accepted snapshots. Edit the live description between refinement and approval and verify the conflict defers replacement. Repeat with comments/attachments-only and local-only, a connector exposing comments but no upload tool (the accepted plan should publish as a comment and the completion comment should include review/verification summaries), a timeout after remote success, and resume/revocation. Verify that changing transport does not duplicate a published full artifact or its summary, that older blocker/completion-only consent does not silently authorize full artifact comments, and that no shell/API workaround is attempted. Check that implementation can complete with deferred ticket updates and that no status transition, linked-ticket mutation, delivery action or feedback upload occurs. These live permission/formatting checks are not simulated by the local tests or the two headless cases.

Run the focused chat-autonomy cases with the normal signed-in headless runner:

```sh
node evals/run-suite.mjs full --case=implement-switch-to-guided --case=implement-switch-to-autopilot --case=implement-resume-changed-autonomy --max-cost-usd=6
```

These cases exercise queued selections against resumed state, not live message-delivery timing. For a manual check, request a different mode during a step or open refinement wave: verify a transparent queue decision, the unchanged effective mode and pending questions, and a refreshed badge showing both modes. Finish the current phase under its original mode; verify application/clearing in the next phase-transition audit row before next-phase work. Test replacement/cancellation, interruption/resume, and a pending Guided approval that still requires its answer. Verify queued Guided creates the next approval gate, queued Autopilot does not infer current answers, and an unused queue is dropped at completion without relabeling validation. Native permissions and delivery approval remain unchanged.

The deterministic feedback writer has local fixture-backed tests for the same
counting, formatting, and preservation rules. Run them without model calls:

```sh
node --test skills/implement/scripts/write-feedback.test.mjs
```

The model-driven cases remain useful for verifying that `implement` invokes
the writer at the right terminal point and uses an independent retrospective
agent for non-minimal runs.

Run all cases from the repository root:

```sh
bash evals/implement/run-all.sh
```

On macOS hosts where Docker Desktop has symlinks inside `~/.docker`, the runner
temporarily points `~/.docker` at an empty config while the eval runs, then
restores the original directory on exit or interruption. It refuses to start
if Docker Desktop is running or if an earlier backup is present. When the only
Git on `PATH` is macOS's `/usr/bin/git` shim, it also places a temporary copy
of the Command Line Tools Git binary at `/opt/homebrew/bin/git` and removes it
afterward. If the process is forcibly killed, inspect
`~/.docker.claude-eval-backup` before running another eval.

Each fixture script refuses to seed an existing Git repository. The cases require Bash because `implement` validates Git state and records real timestamps, and Agent because non-minimal feedback is deliberately analyzed in a fresh subagent.

Loop-limit stops and post-terminal clarification are also covered by the skill's explicit eligibility and ordering contract. They remain manual scenarios because producing those states end-to-end requires replaying the capped review/fix loops rather than safely resuming a deterministic terminal fixture.

Manual startup/permission-badge checks: with a resolved Jira/ADO ticket and write capabilities, verify the interactive choices are Guided, Autonomous, Autopilot, and Autopilot + update ticket. The combined selection must disclose the target/supported scope, persist `autonomy: autopilot` plus a user-sourced publication policy and proceed without a second consent question. Plain Autopilot/`--autopilot` remains local absent separate explicit consent; local-spec, ambiguous-ticket and no-write-connector runs omit the combined option. Resume keeps the saved consent. Verify the separate header badge shows Allowed for any granted operation, Off after revocation or without configuration, and Unknown for missing/corrupt/mismatched referenced journals. Its tooltip must reflect comments-only scope and fallback accurately, and never expose ticket/artifact bodies. The renderer and publication helper tests exercise these badge, scope, binding and refresh-failure invariants locally.

Manual refinement-destination checks (use a disposable ticket; use draft mode or stop before delivery unless a real send is explicitly authorized):

- Start Guided and Autonomous, including with autonomy already selected in chat. Verify a separate destination question appears before branch creation or product questions. With deferred Slack tools, verify discovery runs before deciding which Slack actions to offer. With send-only support, omit draft; with no Slack support or failed discovery, explain the result and offer Answer here or Stop for Slack setup. Stopping must not create a branch.
- Choose Answer here, Slack draft, and explicitly authorized Slack send in separate runs. Verify `refinement_destination` and the Audit log retain the actual choice/source, the stage follows it, and only send mode permits sending. Both Slack paths pause with the actual delivery status; tracker consent must not select a destination or authorize sending.
- Resume an older Guided/Autonomous run at refinement with no destination field and no recorded choice. Verify it asks for a destination before the next product question and preserves answers already given. Also invoke the inline stage with that unresolved state to check its independent guard. When a legacy Audit-log choice exists, recover it without re-asking; generic legacy Slack means draft-only. A saved choice survives an autonomy change or omitted Slack flag.
- Start with no mode flag: verify the autonomy prompt contains only that question, with no Questions/destination tab. Select Autopilot and, in a separate eligible run, Autopilot + update ticket; neither may show a destination question afterward. Repeat with `--autopilot` and an explicit chat selection. Verify `here` is recorded as an automatic default without prompting or sending, and missing required product facts stop with actionable unresolved questions rather than asking live. Select Guided and Autonomous in separate runs to verify each receives its destination question only after the autonomy answer.
- With an explicit Slack destination, preserve it under Autopilot without re-asking. Resume a pending questions file read-only through Phase 5C without choosing a new destination or resending. Reused accepted specs and runs already past refinement must not acquire a new destination prompt.

These destination checks are manual behavioral scenarios, not claims of automated connector or live-session coverage.


## Startup dashboard presentation

The smoke case `implement-dashboard-autonomous-start` runs a fresh Autonomous startup and stops
after its first context check. Its transcript grader requires the clickable
dashboard link in the next assistant message after initialization, before any
further workflow tool call; a path present only in controller output fails.
The controller unit tests cover all autonomy modes, pending-offline creation,
and path characters needing Markdown URL escaping.
The startup Stop hook also requires a normal fresh controller run to continue
beyond `context-check / In Progress` after the link is posted. A final response
containing the link alone does not release that hold. Local hook tests cover
all three autonomy modes, normal Context completion, saved pauses/stops, offline
waits, Resume, and unavailable or malformed state. Tools remain available after
the link so the assistant can continue or checkpoint a genuine blocker.


Historical startup-link validation (2026-11-05): controller and harness unit tests
pass, but four targeted Autonomous model runs still fail immediate assistant-text
presentation. The link is returned by initialization, yet the model continues
with tools and may show it only at completion. In the user's interactive session,
the apparent dashboard announcement was a thinking block displayed as `· summary`,
not an assistant text message. The skill and controller handoff now explicitly
require ordinary text and reject that substitute. The regression remains red;
this is not yet a verified fix. Latest report:
`evals/results/smoke-2026-11-05T21-12-15-446Z/summary.json`.


Continuation follow-up (2026-11-05): a live session showed the clickable link
but ended its turn at that announcement. Startup now calls for a text block and
the Context-check activity/tool in the same assistant response, without waiting
for acknowledgment. The pending-offline case keeps its real wait. The grader
now also requires Context check to execute after the link without another user
message. All 20 controller tests passed. The latest model run did continue
through Context check without user input, but still omitted the assistant-text
link, so the overall startup-link regression remains failing. Report:
`evals/results/smoke-2026-11-05T21-20-16-344Z/summary.json`.

Live follow-up (2026-11-06): `implement-dashboard-autonomous-start` passed in the
13/13 smoke run at `evals/results/smoke-2026-11-06T09-10-43-281Z/summary.json`.
Its transcript includes the assistant-text dashboard link before continued
Context-check work. This records one successful live smoke run; the earlier
failures above remain historical evidence, and browser visual QA is still pending.


## Startup from inside a Git repository

`implement-repo-start-dependencies` starts with an explicitly accepted cross-repo spec and reuse/TDD consent inside connector-app, without --workspace or expanded repository consent. Refinement is already resolved so unrelated product questions do not obscure scope handling. It must surface a blocking workspace/repository approval before implementation or an unapproved connector-only plan. `implement-repo-start-local` checks that ordinary single-repo startup reaches Context check without unnecessary scope questions.

Both use the runner-owned `suites.json` `workingDirectories` entries set to `connector-app`, which changes the actual child-process cwd while retaining the fixture root for grading. No workflow behavior is changed by these evals. The optional runner setting stays out of native CLI prompt frontmatter and accepts only a relative directory that resolves inside the fixture; existing cases default to the fixture root. Run `node --test evals/startup-scope-fixtures.test.mjs evals/run-suite-args.test.mjs` for local checks, and after approval `node evals/run-suite.mjs full --case=implement-repo-start-dependencies --case=implement-repo-start-local --max-cost-usd=2` for model checks.

Live validation on 2026-11-06 against committed workflow `8b34fff`: both startup-scope cases passed. The cross-repo run stopped read-only for actual repository/workspace approval before initialization or branch changes; the local run initialized its dashboard and passed Context check without workspace selection. Summary metadata confirms actual cwd was the connector Git repo. Protected source/test/spec files, all repository branches and HEADs, and sibling working trees were unchanged. The plugin snapshot was unchanged and all 51 current eval-harness tests passed. Local summary: `evals/results/repo-start-scope-verification-2026-11-06/summary.json`. This validates the accepted-spec startup and ordinary Context paths, not approval resume or full implementation. No workflow instructions changed; only eval fixtures and optional headless cwd support were added.

## Early implementation bypass regression

`startup-presentation.test.mjs` reproduces a fresh Autopilot run that edits application code during Context check and records Stopped without running refinement or review. The immutable initializer baseline must still detect that edit after the checkpoint updates normal fingerprints. It also covers refinement edits, advisory link reminders, partial transcript writes, diagnostic replay records and genuine user-turn release. `implementation-guard.test.mjs` covers dirty baselines, staged/deleted/untracked files, approved sibling repositories and authorized implementation/fix/replan routes.

The full Autopilot model case additionally requires stage-ordered source edits, independent review and final packaging. Honest admission of skipped stages or a Stopped checkpoint is a failure when that case requests unattended completion.
