# `go-deep` autopilot smoke test

Three cases exercising `skills/go-deep/SKILL.md`'s `--autopilot` flag: `fresh-onboarding` (first run), `repair-path` (prior-run repair, with one deliberately missing skill), `negative-control` (no `--autopilot`, confirms the interactive path still blocks).

## Running all three at once

```
bash evals/go-deep/run-all.sh
```

Run it yourself (via `!` in a Claude Code session, or directly in a shell/CI) — not something to hand to an agent, since `fresh-onboarding`/`repair-path` need `--dangerously-skip-permissions`, which an agent operating under this harness's own auto-mode safety net can't invoke or grant itself. A plain shell execution (you, or a CI step with no agent in the loop) shouldn't hit that restriction, but that's reasoned, not yet confirmed in an actual CI runner.

## Why this isn't one uniform `claude plugin eval` suite

`claude plugin eval` is the right tool for `negative-control`, which only needs to prove the run never completes unattended:

```
claude plugin eval . --case negative-control --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish
```

`fresh-onboarding` and `repair-path` need to see `go-deep`'s actual output, almost all of which lands under `.claude/` (rules files, skill files, the autopilot log). Claude Code treats `.claude/` as a protected path — confirmed during implementation that **no permission grant or tool allowlist unblocks writing there**, in `claude plugin eval` or in plain headless mode; only `--dangerously-skip-permissions` does. Run these two manually, scoped strictly to a disposable temp directory (never the real repo):

```bash
# Seed the fixture (reuses this case's own fixture.sh)
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash evals/go-deep/fresh-onboarding/fixture.sh)   # or repair-path/fixture.sh

# Run go-deep for real
(cd "$RUN_DIR" && claude -p "/make-it-work:go-deep --autopilot" \
  --plugin-dir /path/to/make-it-work --dangerously-skip-permissions \
  --output-format stream-json --verbose > /tmp/transcript.jsonl)

# Verify: diff git status on the real repo before/after (must be identical),
# then inspect $RUN_DIR's files and $RUN_DIR/.claude/go-deep-autopilot-log.jsonl by hand.
```

The `graders/*.md` files in each case directory still document exactly what "correct" looks like (structure, cross-references, decision-log schema) — useful as a checklist even when run manually rather than through the eval harness's scoring.

## Known gaps in this suite (by design, not oversight)

- Doesn't cover the destructive "Run fresh onboarding" path, 2 of 4 repair-action types, or the single-choice-plus-filler repair-action variant — see the implementation plan's coverage discussion.
- `AskUserQuestion`'s availability is itself environment-dependent: unreachable inside `claude plugin eval` sandboxes (even when granted) and inside `--plugin-dir` headless runs (`TaskCreate`/`TaskUpdate` also weren't available there) — `go-deep` degrades gracefully in both cases. Worth a `SendFeedback` note; not a blocker for this plugin's own behavior.
