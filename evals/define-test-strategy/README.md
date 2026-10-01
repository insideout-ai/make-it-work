# `define-test-strategy` autopilot smoke test

Three cases exercising `skills/define-test-strategy/SKILL.md`'s `--autopilot` flag:

- **`extend-autopilot`** — a project where `go-deep` has already run and `.claude/rules/testing-strategy.md` already exists, complete and correct (Phase 1 case (b), no stray doc). Exercises Phase 1's "Extend" resolution, Phase 3 scaffolding (2 of 4 use cases uncovered → the `multiSelect` branch), Phase 4's coverage report, and Phase 5's CLAUDE.md wiring + hook offer.
- **`define-test-strategy-negative-control`** — the exact same fixture, invoked without `--autopilot`. Confirms the interactive path still blocks at Phase 1's "Decide how to proceed" question instead of silently completing.
- **`fresh-autopilot`** — the same project shape but with no `testing-strategy.md` and no tests at all (Phase 1 case (a), fresh mode, all 4 use cases uncovered → the 4-item `multiSelect` branch). Exercises Phase 2 generating `testing-strategy.md` from scratch and the decision log actually being written.

## Running extend-autopilot and define-test-strategy-negative-control (fully automated)

This skill's only `.claude/`-protected output is `.claude/rules/testing-strategy.md` — everything else (scaffolded tests, `CLAUDE.md` edits, the optional hook) lives outside `.claude/` and is plain-`claude plugin eval`-testable. The decision log (`.claude/define-test-strategy-autopilot-log.jsonl`) is *also* always under `.claude/` per the shared autopilot convention, so its write is denied too under plain eval — but the skill's Autopilot Mode section explicitly handles this (note the fact in the end-of-run summary, then keep going) rather than aborting, so the rest of the run still completes and grades normally.

`extend-autopilot`'s fixture seeds a `testing-strategy.md` that is already complete and correct, so Phase 2 never needs to write to it in that case — the only `.claude/` write it ever attempts is the (expected-denied) decision log.

```bash
claude plugin eval . --case extend-autopilot \
  --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish

claude plugin eval . --case define-test-strategy-negative-control \
  --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish
```

Both were run and verified for real during implementation (3 consecutive runs each, scoring 1.0/1.0 on every grader; `extend-autopilot`'s transcript and output files were additionally read in full by hand via `--keep-temp`, not just graded — see "What was verified by hand" below).

## Running fresh-autopilot (manual, `--dangerously-skip-permissions`)

`fresh-autopilot` needs Phase 2 to actually **write** `.claude/rules/testing-strategy.md` from scratch (case (a), nothing exists yet). Claude Code treats `.claude/` as a protected path — no tool grant or `--allow-tools` unblocks writing there, in `claude plugin eval` or in plain headless mode; only `--dangerously-skip-permissions` does, and only a human can invoke that (an agent operating under this harness's own safety net can't invoke it or grant it to itself). Run it manually, scoped strictly to a disposable temp directory (never the real repo):

```bash
# Seed the fixture
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash evals/define-test-strategy/fresh-autopilot/fixture.sh)

# Run define-test-strategy for real
(cd "$RUN_DIR" && claude -p "/make-it-work:define-test-strategy --autopilot" \
  --plugin-dir /path/to/make-it-work --dangerously-skip-permissions \
  --output-format stream-json --verbose > /tmp/transcript.jsonl)

# Verify: diff git status on the real repo before/after (must be identical),
# then inspect $RUN_DIR's files — especially .claude/rules/testing-strategy.md
# and .claude/define-test-strategy-autopilot-log.jsonl — by hand against
# evals/define-test-strategy/fresh-autopilot/graders/*.md.
```

Or run all three at once (the last one manual):

```bash
bash evals/define-test-strategy/run-all.sh
```

This case was **not** run during implementation — it requires the manual bypass an agent cannot invoke on itself. The command above is the exact one a human needs to run to complete that verification. The `graders/*.md` files in `fresh-autopilot/` document exactly what "correct" looks like (the four fixed headings in order, the intro line, the `## Commands` first line, the decision-log schema for a 4-way `multiSelect` scaffold) — useful as a checklist even when read by hand rather than scored by the harness.

## What was verified by hand (not just graded)

During implementation, `extend-autopilot` was run three times via `claude plugin eval` and its output inspected directly (via `--keep-temp`, reading the sealed sandbox's files and the full final assistant message), confirming:

- `.claude/rules/testing-strategy.md` (pre-seeded, already complete) was correctly left alone — Phase 2 found no gaps and made no write.
- `__tests__/uc-03-receive-overdue-reminder.test.js` and `__tests__/uc-04-delete-task.test.js` were created, each with the exact marker as its first line and a `node:test` native-skip placeholder body — named by deriving from the matching `go-deep` skill directory, exactly as specified.
- The pre-existing scaffolded-only `uc-02-complete-task.test.js` placeholder was left untouched, not duplicated or re-scaffolded.
- `CLAUDE.md`'s "Rules Files" section gained exactly one new row for `testing-strategy.md`, its two original rows untouched; the "After Any Feature Change" checklist gained exactly one new "Regression check" item, inserted *before* the original "Skill docs" item; the quick-lookup table and the opening SENTINEL line were both left byte-for-byte intact.
- Phase 4's coverage report correctly classified all four use cases (covered / scaffolded-only / scaffolded-only / scaffolded-only) and correctly flagged the `notifications` domain as uncovered while not flagging `tasks`.
- Phase 5's hook offer correctly auto-selected "No hook — CLAUDE.md instruction is enough" (the hard-stop exception) — no hook file was written.
- The decision log write to `.claude/define-test-strategy-autopilot-log.jsonl` was denied by the sandbox, and the run **explicitly said so in its end-of-run summary and continued anyway** rather than aborting or relocating the log — confirming the Autopilot Mode section's graceful-degradation instruction actually works as written, not just as documented.
- As an incidental but reassuring finding: the model noticed the fixture's embedded `SENTINEL: ...` line read like a planted instruction and explicitly flagged it as suspicious rather than acting on it — it was never intended as a prompt-injection test, but it's a good sign that the fixture's incidental "SENTINEL" wording (copied from `go-deep`'s own fixture style) didn't get treated as a real instruction.

## A grader-tooling finding from this work (not a skill defect)

The `file_exists` grader type was found to unreliably report "missing" for files that demonstrably exist in the final sandbox state (confirmed by direct filesystem inspection via `--keep-temp`), reproducibly, even for a static fixture file (`package.json`) the agent never touched. `regex`/`llm` graders with `target`/`focus: { source: file, path: ... }` were confirmed to read the correct, final file content reliably. Because of this, this suite uses `regex`/`llm` file-sourced checks throughout instead of `file_exists`. Separately, the default `--judge-model` (`haiku`) was noticeably less reliable than `sonnet` on multi-criteria structural `llm` graders with `focus: trace` or a long checklist in one prompt — graders in this suite were kept short, single-focus, and pointed at `last_message` (not raw `trace`) specifically to work reliably under the default judge; this was verified empirically (3 consecutive clean runs) rather than assumed.

## Known gaps in this suite (by design, not oversight)

- `fresh-autopilot` was authored and its fixture hand-built, but not run during implementation — it needs the manual `--dangerously-skip-permissions` path (see above).
- `adopt` mode (Phase 1 case (c), a stray test-strategy doc found elsewhere in the repo) and Phase 1's case (d) "Re-check coverage only" path are not covered by any case here. Autopilot never auto-selects "Re-check coverage only" (Extend/Adopt always carries the `(Recommended)` label when offered), so case (d) is unreachable under autopilot by design; `adopt` mode would need its own fixture and, like `fresh-autopilot`, the manual-bypass path (it also writes `testing-strategy.md`).
- None of the "hard-stop, require a human" sites (ambiguous workspace root, extend/adopt content conflicts, no discoverable test command, a framework with no skip mechanism, a malformed `CLAUDE.md` section, an existing non-empty hook file) are exercised by any case here — each would need its own deliberately-broken fixture.
- Multi-repo workspace behavior is not exercised — both fixtures are single-repo.
