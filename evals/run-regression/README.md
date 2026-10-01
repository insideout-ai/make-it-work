# `run-regression` autopilot smoke test

Six cases exercising `skills/run-regression/SKILL.md`'s `--autopilot` flag
and its underlying full-suite/scoped-mode logic:

| Case | Invocation | Exercises |
|---|---|---|
| `rr-negative-control` | `/make-it-work:run-regression` (no `--autopilot`) | The Phase 0 mode-choice question still blocks unattended, independent of what its eventual autopilot default turns out to be. |
| `rr-no-command-stop` | `--autopilot full` | Phase 1's stop-and-ask fallback when no full-suite command is discoverable — the one site explicitly exempted from the general "best-guess" autopilot rule (never invent a test command). |
| `rr-scoped-unavailable` | `--autopilot domain-velocity` | Phase 2's scoped-mode availability gate (no `testing-strategy.md`) firing even with an explicit, otherwise-valid scope token. |
| `rr-full-pass` | `--autopilot full` | The full happy path: discover `npm test` via `package.json`, run it, report `Gate result: PASS`. |
| `rr-full-fail` | `--autopilot full` | A plain exit-code `FAIL` (no `Reason:`), with the captured output tail shown. |
| `rr-scoped-explicit` | `--autopilot domain-velocity` | Full scoped-mode machinery: `testing-strategy.md` + `product.md`/`architecture.md` as the inventory, tag-substring file matching, the `npm run <script> -- <files>` passthrough rule, and that an unrequested domain's tests are never touched. |

## Running all six at once

```
bash evals/run-regression/run-all.sh
```

Run it yourself (via `!` in a Claude Code session, or directly in a shell/CI)
— `rr-full-pass`/`rr-full-fail`/`rr-scoped-explicit` may fall back to
`--dangerously-skip-permissions`, which an agent operating under this
harness's own auto-mode safety net can't invoke or grant itself.

## Why this isn't one uniform `claude plugin eval` suite

Unlike `go-deep`, `run-regression` writes **nothing to disk** under normal
operation — the Phase 5 report is returned live, never persisted (see
`SKILL.md`'s Phase 5). The *only* thing this skill ever writes to disk is
`--autopilot`'s own decision log, `.claude/run-regression-autopilot-log.jsonl`
— and that path is under the same protected `.claude/` directory `go-deep`
already found: no tool grant (`Write`, `Edit`, or even `Bash` touching that
path) unblocks writing there inside `claude plugin eval`; only
`--dangerously-skip-permissions`, run manually, does.

That puts `run-regression` in the middle category the top-level autopilot
rollout spec describes (§2): most of its behavior needs **no** `.claude/`
exposure at all, but the one decision-log write does. Concretely:

- **`rr-negative-control`, `rr-no-command-stop`, `rr-scoped-unavailable`** never
  need to run a test command or inspect the autopilot log to prove their point
  (a question still blocks; a missing command is never invented; an
  unavailable gate still stops before touching `.claude/` at all). These run
  as plain `claude plugin eval` cases, no `Bash` grant, no manual step,
  verified for real (see "What was actually run" below):

  ```bash
  claude plugin eval . --case rr-negative-control --eval-dir evals/run-regression \
    --scaffold --allow-tools Read Glob Grep AskUserQuestion --ablation none --runs 1 --trust-plugin --no-publish

  claude plugin eval . --case rr-no-command-stop --eval-dir evals/run-regression \
    --scaffold --allow-tools Read Glob Grep --ablation none --runs 1 --trust-plugin --no-publish

  claude plugin eval . --case rr-scoped-unavailable --eval-dir evals/run-regression \
    --scaffold --allow-tools Read Glob Grep --ablation none --runs 1 --trust-plugin --no-publish
  ```

  (`--eval-dir evals/run-regression` scopes case discovery to this
  directory only — useful while other skills' eval suites are being
  authored concurrently elsewhere under `evals/`. `--case` names must be
  globally unique across the whole plugin's eval tree, which is why every
  case here is prefixed `rr-`.)

- **`rr-full-pass`, `rr-full-fail`, `rr-scoped-explicit`** need `Bash` to
  actually run the fixture's test suite. Each one's `autopilot-log-exists.md`
  grader can only score meaningfully on a manual
  `--dangerously-skip-permissions` run (same reasoning as
  `define-test-strategy`'s single blocked-path case in the rollout spec) —
  but their PASS/FAIL-determination graders don't touch `.claude/` and, on a
  machine without the Docker issue below, should run fine as plain
  `claude plugin eval --allow-tools Bash` cases, with only the log check
  needing the manual follow-up.

  **On this machine**, granting `Bash` to any `claude plugin eval` case fails
  outright, before the agent even starts:

  ```
  error: the Docker (~/.docker, DOCKER_CONFIG) credential store on this
  machine holds a symbolic link inside it, so the Bash sandbox cannot
  reliably exclude it — a Bash-granting evaluation cannot run here; keep
  the store's contents in one plain directory (its root may be a link)
  ```

  This is the exact, known, unresolved, machine-specific issue the rollout
  spec's §1.5 names — confirmed by reproducing it directly during this
  work, not inferred. It is unrelated to `.claude/` protection and was
  never resolved during `go-deep`'s own work (which never needed a Bash
  grant at all, so never exercised this path). **It resurfaced here as
  predicted** — this is the first skill in the rollout where it actually
  matters, since `run-regression` is the only one whose core job is to run
  real Bash commands.

  Until this machine's `~/.docker` layout is fixed (or the suite runs on a
  different machine/CI without it), run these three manually instead —
  `run-all.sh` does this automatically as a fallback, or by hand:

  ```bash
  # Seed the fixture
  RUN_DIR=$(mktemp -d)
  (cd "$RUN_DIR" && bash evals/run-regression/rr-full-pass/fixture.sh)   # or rr-full-fail, rr-scoped-explicit

  # Run run-regression for real
  (cd "$RUN_DIR" && claude -p "/make-it-work:run-regression --autopilot full" \
    --plugin-dir /path/to/make-it-work --dangerously-skip-permissions \
    --output-format stream-json --verbose > /tmp/transcript.jsonl)
  # (rr-scoped-explicit uses --autopilot domain-velocity instead of --autopilot full)

  # Verify: diff `git status --porcelain --ignored -- skills/run-regression evals/run-regression`
  # on the real repo before/after (must be identical — scope the diff to these two
  # paths only while other agents may be concurrently changing the rest of the tree),
  # then inspect $RUN_DIR's final message and $RUN_DIR/.claude/run-regression-autopilot-log.jsonl.
  ```

  The `graders/*.md` files in each case directory still document exactly
  what "correct" looks like — useful as a checklist even when run manually.

## What was actually run and verified (not just graded)

All six cases were run for real during this work and their full output was
read by hand — a grader passing isn't proof the skill behaves correctly, so
this suite was held to the same bar `go-deep`'s `fresh-onboarding`/
`repair-path` manual runs were:

- **`rr-negative-control`** — via plain `claude plugin eval`. Confirmed
  `AskUserQuestion` is unreachable in this sandbox (same finding as
  `go-deep`'s README): the agent fell back to presenting the Full
  suite/Scoped choice as plain text and stopped there, exactly as the
  no-`--autopilot` path requires.
- **`rr-no-command-stop`** — via plain `claude plugin eval`. Confirmed the
  agent found no test script/Makefile/CI config, printed Phase 1's stop
  message verbatim, never invented a substitute command, and never printed
  a `Gate result:` line.
- **`rr-scoped-unavailable`** — via plain `claude plugin eval`. Confirmed the
  availability gate fired immediately (before any token validation) because
  `.claude/rules/testing-strategy.md` was absent, with the exact stop
  message and no `Gate result:` line.
- **`rr-full-pass`** — via manual `--dangerously-skip-permissions` run.
  Confirmed `npm test` was discovered and run, `Gate result: PASS` was
  reported in the exact fixed-block shape, and — critically —
  `.claude/run-regression-autopilot-log.jsonl` was created **empty** (0
  bytes), confirming the "log always exists under `--autopilot`, even when
  zero interactive sites fire" design decision actually holds in practice.
- **`rr-full-fail`** — via manual `--dangerously-skip-permissions` run.
  Confirmed `Gate result: FAIL` with no `Reason:` bracket and the real
  `node --test` assertion failure shown in the captured output tail.
- **`rr-scoped-explicit`** — via manual `--dangerously-skip-permissions`
  run. Confirmed the agent read `testing-strategy.md`'s `## Commands`
  section, constructed `npm run test -- test/domain-velocity.test.js`
  (correctly inserting `--` for the `npm run` wrapper per Phase 3's
  passthrough rule), ran only that one file, never touched
  `test/domain-billing.test.js`, and reported `Gate result: PASS`.

In every manual run, `git status --porcelain --ignored -- skills/run-regression
evals/run-regression` was diffed before/after and found identical — the real
repo (within this work's scope) was never touched.

## Known gaps in this suite (by design, not oversight)

- The two genuinely-ambiguous-repo sites (Phase 0: unrelated clones with no
  unifying doc; an ambiguous workspace-repo target for a scoped run) aren't
  covered — both resolve to "stop and require a human" in `--autopilot`
  (no safe default to infer), and exercising them needs a multi-repo/
  multi-clone fixture shape this smoke suite doesn't build.
- The combined domain/UC candidate-list confirmation (Phase 0, reached only
  when "Scoped" is chosen with no tokens) is unreachable under `--autopilot`
  today, since the mode-choice site above it always stops first — see
  `SKILL.md`'s Autopilot Mode resolution table.
- Multi-repo (workspace) mode isn't covered — every fixture here is a plain
  single-repo project.
- `AskUserQuestion`'s availability is itself environment-dependent —
  unreachable inside `claude plugin eval` sandboxes (confirmed above), same
  as `go-deep` found. Not a blocker for this skill's own behavior.

## The unresolved product decision this work surfaced (see the handback report)

`SKILL.md`'s Autopilot Mode section resolves the Phase 0 mode-choice site
(Full suite vs. Scoped, no argument) by requiring an explicit `full`/
`domain-*`/`UC-*` argument under `--autopilot` rather than guessing a
default — because the skill's own text names no `(Recommended)` option
there today. This was a deliberate choice to avoid inventing a default
silently; whether a future maintainer instead wants to add a
`(Recommended)` label to one of the two options (so autopilot can resolve
it outright) is an open product decision, not something this suite assumes
an answer to. `rr-negative-control` is written to pass either way, since it
only asserts that the interactive path still blocks — not which option
autopilot will eventually default to.
