# `run-regression` autopilot smoke test

Ten cases exercising `skills/run-regression/SKILL.md`'s `--autopilot` flag
and its underlying full-suite/scoped-mode logic:

| Case | Invocation | Exercises |
|---|---|---|
| `rr-negative-control` | `/make-it-work:run-regression` (no `--autopilot`) | The Phase 0 mode-choice question still blocks unattended, independent of what its eventual autopilot default turns out to be. |
| `rr-no-command-stop` | `--autopilot full` | Phase 1's stop-and-ask fallback when no full-suite command is discoverable — the one site explicitly exempted from the general "best-guess" autopilot rule (never invent a test command). |
| `rr-scoped-unavailable` | `--autopilot velocity-app:domain-velocity` | Phase 2's scoped-mode availability gate firing even with an explicit, otherwise-valid scope token: the prefix resolves to `velocity-app/` under a one-repo workspace root, and that repo has no `.claude/skills/test-strategy/SKILL.md`. |
| `rr-full-pass` | `--autopilot full` | The full happy path: discover `npm test` via `package.json`, run it, report `Gate result: PASS`. |
| `rr-full-fail` | `--autopilot full` | A plain exit-code `FAIL` (no `Reason:`), with the captured output tail shown. |
| `rr-scoped-explicit` | `--autopilot velocity-app:domain-velocity` | Workspace-root prefix resolution, temporary evidence-backed discovery under a current strategy with a missing map, npm argument passthrough, token-run report grammar and exclusion of unrequested domains. |
| `rr-embedded-tests` | `--autopilot embedded-tests:UC-01 embedded-tests:UC-03` | Missing-map discovery under the current strategy; execute embedded unit, documentation and colocated tests using real selectors. Preserve distinct test kinds sharing a file; disclose broader runner scope. |
| `rr-cross-repo` | `--autopilot payments-api:UC-08 ledger-api:UC-08 full:payments-api full:ledger-api` | Behavior-backed cross-repo selection, CI-only not-run handling, explicit full-suite runs, unrelated UC-080 exclusion and FAIL from the intentionally failing ledger test. |
| `rr-unrelated-clones` | `--autopilot full` | Phase 0's repo-ambiguity stop: two unrelated clones with no workspace orientation file, so the run must ask which repo to test rather than pick one. |

`rr-index-reuse` adds a native shared-map fixture: validate content freshness, reuse saved checkout/label mappings, execute unittest plus doctest, and leave map/strategy/source unchanged. Run it with `node evals/run-suite.mjs full --case=rr-index-reuse`. Historical observations below describe earlier tag-based releases; current selection follows `docs/test-map-contract.md`.

## Running the original six at once

```
bash evals/run-regression/run-all.sh
```

`run-all.sh` covers the six original cases; run `rr-cross-repo` and
`rr-unrelated-clones` through `node evals/run-suite.mjs` (see `evals/README.md`).

Run it yourself (via `!` in a Claude Code session, or directly in a shell/CI)
— `rr-full-pass`/`rr-full-fail`/`rr-scoped-explicit` may fall back to
`--dangerously-skip-permissions`, which an agent operating under this
harness's own auto-mode safety net can't invoke or grant itself.

## Why this isn't one uniform `claude plugin eval` suite

Unlike `go-deep`, `run-regression` writes **nothing to disk** under normal
operation — the Phase 5 report is returned live, never persisted (see
`SKILL.md`'s Phase 5). The *only* thing this skill ever writes to disk is
`--autopilot`'s own decision log, `make-it-work/run-regression-autopilot-log.jsonl`.
That protected path may be denied by the eval sandbox. With a Bash grant,
however, the shared `scripts/decision-log.mjs` writer has been observed to
initialize the log successfully when invoked in its own tool call. A denial
must not be retried through another tool or path.

That puts `run-regression` in the middle category the top-level autopilot
rollout spec describes (§2): most of its behavior needs **no** `.claude/`
exposure at all, but the one decision-log write does. Concretely:

- **`rr-negative-control`, `rr-no-command-stop`, `rr-scoped-unavailable`** never
  need to run a test command or inspect the autopilot log to prove their point
  (a question still blocks; a missing command is never invented; an
  unavailable gate still stops before any tests run). These run
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
  actually run the fixture's test suite. Their `autopilot-log-exists.md`
  graders are meaningful when the shared writer's log operation succeeds;
  inspect the trace on a failure to distinguish a permission denial from a
  skill regression. Their PASS/FAIL-determination graders do not depend on
  `.claude/` and remain meaningful even if the log write is denied.

  **On this machine**, granting `Bash` without preparing the environment
  fails before the agent starts:

  ```
  error: the Docker (~/.docker, DOCKER_CONFIG) credential store on this
  machine holds a symbolic link inside it, so the Bash sandbox cannot
  reliably exclude it — a Bash-granting evaluation cannot run here; keep
  the store's contents in one plain directory (its root may be a link)
  ```

  `run-all.sh` now uses `evals/with-bash-eval-environment.sh` for these three
  cases. The wrapper temporarily isolates the Docker config and uses a direct
  Git binary if macOS's `/usr/bin/git` shim is the only one on `PATH`. It
  restores the host state on exit or interruption. If a Bash-granted eval
  still fails, the runner falls back to a manual headless run, or run one by
  hand:

  ```bash
  # Seed the fixture
  RUN_DIR=$(mktemp -d)
  (cd "$RUN_DIR" && bash evals/run-regression/rr-full-pass/fixture.sh)   # or rr-full-fail, rr-scoped-explicit

  # Run run-regression for real
  (cd "$RUN_DIR" && claude -p "/make-it-work:run-regression --autopilot full" \
    --plugin-dir /path/to/make-it-work --dangerously-skip-permissions \
    --output-format stream-json --verbose > /tmp/transcript.jsonl)
  # (rr-scoped-explicit uses --autopilot velocity-app:domain-velocity instead of --autopilot full)

  # Verify: diff `git status --porcelain --ignored -- skills/run-regression evals/run-regression`
  # on the real repo before/after (must be identical — scope the diff to these two
  # paths only while other agents may be concurrently changing the rest of the tree),
  # then inspect $RUN_DIR's final message and $RUN_DIR/make-it-work/run-regression-autopilot-log.jsonl.
  ```

  The `graders/*.md` files in each case directory still document exactly
  what "correct" looks like — useful as a checklist even when run manually.

## What was actually run and verified (not just graded)

The six original cases were run for real during this work and their full output was
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
  the repo's strategy file was absent, with the exact stop message and no
  `Gate result:` line. (Recorded for the earlier single-repo layout; the case
  now resolves the `velocity-app:` prefix to `velocity-app/` and checks for
  `.claude/skills/test-strategy/SKILL.md` there — re-run to re-confirm.)
- **`rr-full-pass`** — via manual `--dangerously-skip-permissions` run.
  Confirmed `npm test` was discovered and run, `Gate result: PASS` was
  reported in the exact fixed-block shape, and — critically —
  `make-it-work/run-regression-autopilot-log.jsonl` was created **empty** (0
  bytes), confirming the "log always exists under `--autopilot`, even when
  zero interactive sites fire" design decision actually holds in practice.
- **`rr-full-fail`** — via manual `--dangerously-skip-permissions` run.
  Confirmed `Gate result: FAIL` with no `Reason:` bracket and the real
  `node --test` assertion failure shown in the captured output tail.
- **`rr-scoped-explicit`** — via manual `--dangerously-skip-permissions`
  run, against the earlier single-repo, path-tag layout: the agent
  constructed the scoped `npm run test -- <file>` command (correctly
  inserting `--` for the `npm run` wrapper per Phase 3's passthrough rule),
  ran only the velocity file, never touched the billing file, and reported
  `Gate result: PASS`. The case now runs from a workspace root: the
  `velocity-app:` prefix resolves to `velocity-app/`, the strategy's
  `## How to Scan` grep selects `test/sprint.test.js` by its
  `@covers velocity-app:domain-velocity` content tag (not by path), and the
  expected report is the token-run grammar (`Workspace: 1 runs`,
  `Mode: Scoped`, one block running `npm run test -- test/sprint.test.js`
  from `velocity-app`, `Not run: None`, `Unmapped scope (not run): None`,
  `Overall gate result: PASS`). Not yet re-run live against this layout.
- **`rr-cross-repo`** — not yet run live; its graders document the expected
  mixed-prefix report (`Mode: Scoped + full`, the `ci-only` and
  `no tests in repo` `Not run:` entries, no decoy, overall FAIL).

In every manual run, `git status --porcelain --ignored -- skills/run-regression
evals/run-regression` was diffed before/after and found identical — the real
repo (within this work's scope) was never touched.

## Known gaps in this suite (by design, not oversight)

- Of the two genuinely-ambiguous-repo sites, only the unrelated-clones stop
  is covered (`rr-unrelated-clones`). The other — the no-argument Scoped
  picker's repo pick at a workspace root — is unreachable under
  `--autopilot`, and token runs need no pick, since each `<repo>:` prefix
  names its repo.
- The combined domain/UC candidate-list confirmation (Phase 0, reached only
  when "Scoped" is chosen with no tokens) is unreachable under `--autopilot`
  today, since the mode-choice site above it always stops first — see
  `SKILL.md`'s Autopilot Mode resolution table.
- Bare-`full` multi-repo (workspace) mode isn't covered. Token runs across
  repos are covered by `rr-cross-repo`, and `rr-scoped-*` run from a
  one-repo workspace root.
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
