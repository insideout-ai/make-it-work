# Implement feedback evals

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
- `implement-switch-to-guided` changes an existing Autopilot run at a pending spec approval, overriding a stale `--autopilot` flag without approving the spec or truncating prior logs.
- `implement-switch-to-autopilot` changes Guided to Autopilot before a resumed Execute completion gate. It checks saved progress and nested regression policy; the deliberately unavailable full-suite command must stop without a live prompt, invented PASS, or manual-policy downgrade.
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

These cases exercise actual mode-selection instructions against resumed state. They do not emulate Claude Code's interactive message-delivery timing. For the manual mid-run check, start `implement --autopilot`, type `switch to Guided` while a step/tool is running, and verify acknowledgement after message delivery, application by the next safe step/batch checkpoint, a same-phase mode-change row, and a refreshed dashboard before further dispatch. Switch back to Autopilot and repeat; previous log entries and Progress must remain intact. Also check switching to Autonomous/Autopilot at a pending spec/plan approval (skip the gate without recording user approval), a mode change that leaves a missing required fact unresolved, and a resumed run with a changed workspace (the mode request must not approve Resume anyway). Delivery opt-in/approval and native Claude Code permission modes must remain unchanged.

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
