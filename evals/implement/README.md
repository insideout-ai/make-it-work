# Implement feedback evals

These cases resume a seeded `implement` run at `final-sync`, allowing the terminal feedback hook to be exercised without replaying refinement, planning, execution, and review.

- `feedback-clean` verifies the compact entry for a minimal completed run.
- `feedback-nonminimal` verifies Audit-log-based counting, retrospective analysis, skill attribution, share-safe output, and subagent dispatch after counters have reset.
- `feedback-idempotent` verifies replacement of the matching run block while preserving older runs and user-authored text.

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
