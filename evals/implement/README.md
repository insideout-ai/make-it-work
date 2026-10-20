# Implement feedback evals

These cases resume a seeded `implement` run at `final-sync`, allowing the terminal feedback hook to be exercised without replaying refinement, planning, execution, and review.

- `feedback-clean` verifies the compact entry for a minimal completed run.
- `feedback-nonminimal` verifies Audit-log-based counting, retrospective analysis, skill attribution, share-safe output, and subagent dispatch after counters have reset.
- `feedback-idempotent` verifies replacement of the matching run block while preserving older runs and user-authored text.
- `implement-autopilot-full` starts from `main` and verifies the unattended implementation path creates a feature branch, records autopilot state/logging, implements the requested policy, and reaches a clean terminal state before the optional delivery offer.
- `implement-no-tooling` starts without a test strategy, tests or configured command. It checks readiness/setup before planning, a real baseline behavior test, strategy generation, retained setup changes, and automated implementation/gate completion.
- `implement-empty-strategy` starts with an existing generated `none` strategy. It checks activation after verified setup rather than keeping stale facts through refresh, while preserving an unrelated user-written Team note.
- `implement-switch-to-guided` changes an existing Autopilot run at a pending spec approval, overriding a stale `--autopilot` flag without approving the spec or truncating prior logs.
- `implement-switch-to-autopilot` changes Guided to Autopilot before a resumed Execute completion gate. It checks saved progress and nested regression policy; the deliberately unavailable full-suite command must stop without a live prompt, invented PASS, or manual-policy downgrade.
- `implement-resume-changed-autonomy` resumes saved Autopilot without a flag after a trailing mode-change Audit-log row, preserving its history and completing the older run without schema backfill.

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
