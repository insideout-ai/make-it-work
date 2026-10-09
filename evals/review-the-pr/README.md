# `review-the-pr` autopilot smoke test

Three cases exercising `skills/review-the-pr/SKILL.md`'s `--autopilot` flag:
`autopilot-bare` (no PR link, no requirements supplied — exercises all three
interactive sites' fallback paths), `autopilot-full-info` (PR link and
requirements supplied up front — exercises the "already answered, skip the
prompt" path for the first two sites, while the branch-pair checkpoint still
fires per the skill's "always ask" rule), and `review-the-pr-negative-control`
(no `--autopilot`, confirms the interactive path still blocks at Step 0).

All three share one fixture scenario: a tiny in-memory task tracker
(`main` branch) and a feature branch `feature/TASK-100-clear-assignee-on-complete`
that correctly implements its stated requirement (clear `assignedTo` on
completion) but, in doing so, regresses an architectural constraint — it stops
calling the shared `taskRepo.getTaskById` helper and reads the raw `tasks`
array directly, bypassing the soft-delete filter. This gives every case's
`review-the-pr` run a real, documented-rule violation to actually find.

## ⚠ Incident during this suite's development

While building this suite, one `fixture.sh` invocation was run with its cwd
accidentally left at this plugin's own repo root instead of a disposable temp
dir, so it seeded fixture content and ran `git add -A`/`git commit`/
`git checkout -b` against the real, shared repo instead of an isolated
directory — sweeping in whatever was uncommitted across the tree at that
moment and leaving the shared checkout on the wrong branch for a time. This
was caught, reported to, and is being resolved centrally by the session
coordinator (recovery touches shared repo state other concurrent agents also
depend on, so it isn't something this skill's own work fixes unilaterally).
The real root `README.md` was restored by hand as an immediate, narrow
mitigation (a pure content fix, not a branch/history change).

**Fix applied here to prevent a repeat**: all three `fixture.sh` scripts in
this directory now refuse to run if their cwd's git toplevel is this plugin's
own repo root (verified to both fire against the real repo and *not*
false-positive inside a `claude plugin eval --scaffold` sandbox, whose cwd can
itself be nested inside an unrelated git work tree). `evals/go-deep/*/fixture.sh`
have the same latent hazard and do not yet have this guard — out of scope for
this skill's own work, noted here rather than fixed.

## Running all three at once

```
bash evals/review-the-pr/run-all.sh
```

Run it yourself (via `!` in a Claude Code session, or directly in a shell/CI)
— not something to hand to an agent operating under this harness's own
auto-mode safety net, which blocks `--dangerously-skip-permissions` from
being invoked or granted to itself. `run-all.sh` now also snapshots the real
repo's checked-out branch and HEAD commit (not just a scoped `git status`)
before and after each manual run, and fails loudly if either changed — the
scoped-path status check alone is exactly what let the incident above go
unnoticed for as long as it did.

## Why this isn't one uniform `claude plugin eval` suite

`claude plugin eval` is the right tool for `review-the-pr-negative-control`,
which only needs to prove the run never completes unattended and never needs
Bash at all (Step 0 — the only step it reaches — is a plain-text question,
before any git command runs):

```
claude plugin eval . --case review-the-pr-negative-control --scaffold --allow-tools Read Glob Grep \
  --ablation none --runs 1 --trust-plugin --no-publish
```

(Named `review-the-pr-negative-control`, not plain `negative-control` —
`evals/go-deep/negative-control` already uses that name, and `--case` matches
by name across the whole suite, not per-skill; running both unqualified
collides and silently runs go-deep's case too.)

`autopilot-bare` and `autopilot-full-info` need to run `review-the-pr` to
completion, which means running real `git diff`/`git branch -r`/`git show`
commands (Step 1 — establishing the diff — is not optional; every real
review needs it) and writing the autopilot decision log to
`make-it-work/review-the-pr-autopilot-log.jsonl`. Two independent things block
doing this through `claude plugin eval` on this machine:

1. **Granting `Bash` to a `claude plugin eval` case fails outright here.**
   Confirmed directly during this work: a throwaway case with
   `allowed_tools: [Bash]` and `--allow-tools Bash` errors with
   `the Docker (~/.docker, DOCKER_CONFIG) credential store on this machine
   holds a symbolic link inside it, so the Bash sandbox cannot reliably
   exclude it — a Bash-granting evaluation cannot run here`. This is the
   exact, previously-unresolved, machine-specific issue the rollout spec
   (§1.5) flagged from the `go-deep` work — it resurfaces here because,
   unlike `go-deep`, `review-the-pr` cannot do anything past Step 0 without
   Bash. It has nothing to do with `.claude/` protection and would need a
   different machine/CI environment to actually exercise.
2. **`.claude/` is a protected path everywhere**, confirmed during the
   `go-deep` work and unchanged here: no tool grant unblocks writing there,
   in `claude plugin eval` or in plain headless mode; only
   `--dangerously-skip-permissions` does. The decision log
   (`make-it-work/review-the-pr-autopilot-log.jsonl`) always lands there, by this
   rollout's own convention (spec §1), even though this skill's own normal
   output (`make-it-work/<TICKET>-review.md`) does not.

Because blocker 1 alone already rules out `claude plugin eval` for any case
that runs Step 1, both positive cases need the full manual treatment (not the
narrower "verify just one blocked path" pattern some sibling skills use).
Run them manually, scoped strictly to a disposable temp directory (never the
real repo — see the Incident section above for exactly what goes wrong if
you don't):

```bash
# Seed the fixture (reuses this case's own fixture.sh; it now refuses to run
# anywhere inside this plugin's own real checkout, as a safety net)
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash evals/review-the-pr/autopilot-bare/fixture.sh)   # or autopilot-full-info/fixture.sh

# Run review-the-pr for real. Note: on THIS machine, both manual runs below
# succeeded without --dangerously-skip-permissions (using
# --allowedTools Read Glob Grep Skill Write Edit "Bash(git:*)" instead) and
# still wrote the .claude/ decision log and ran mkdir/find/npm/node beyond
# that allowlist — this machine's global Claude Code settings evidently grant
# more than the flags alone show, so that is NOT proof `.claude/` writes work
# without the bypass flag on a clean machine. Keep --dangerously-skip-permissions
# in the command below (and in run-all.sh) as the documented, portable path;
# treat this machine's result as a bonus data point, not the general case.
(cd "$RUN_DIR" && claude -p "/make-it-work:review-the-pr --autopilot" \
  --plugin-dir /path/to/make-it-work --dangerously-skip-permissions \
  --output-format stream-json --verbose > /tmp/transcript.jsonl)
# (autopilot-full-info's actual invocation text is its prompt.md body, not
# just the bare slash command — see run-all.sh, which extracts it for you.)

# Verify: check the real repo's branch/HEAD and a scoped git status before
# and after (run-all.sh does this for you), then inspect
# $RUN_DIR/make-it-work/TASK-100-review.md and
# $RUN_DIR/make-it-work/review-the-pr-autopilot-log.jsonl by hand.
```

The `graders/*.md` files in each case directory still document exactly what
"correct" looks like (the specific finding expected, the decision-log
schema) — useful as a checklist even when run manually rather than through
the eval harness's scoring.

## What was actually verified (not just graded)

Both positive cases were run for real during this work, manually, in a
disposable `mktemp` dir, outside `claude plugin eval` (headless `claude -p`,
`--allowedTools Read Glob Grep Skill Write Edit "Bash(git:*)"`, no
`--dangerously-skip-permissions` — see the caveat above about why this
doesn't generalize). Both transcripts were read in full, not just graded:

- **`autopilot-bare`** (run against an earlier fixture revision that still had
  a stray, never-imported `src/tasks/completeTask.feature.js` committed on
  `main`; the shipped `fixture.sh` no longer commits that file at all — it
  lives next to `fixture.sh`, outside the `fixture/` tree, and is only copied
  in as `src/tasks/completeTask.js`'s feature-branch content): ran
  `git branch -r`, `git log`, `git diff --name-only
  main...HEAD` via Bash, correctly resolved the diff, wrote
  `make-it-work/review-the-pr-autopilot-log.jsonl` with exactly three lines
  matching the Autopilot Mode resolution table (`pr-link` → `open_text`,
  resolved to "no PR yet"; `requirements-source` → `open_text`, attempted a
  real Jira MCP lookup for `TASK-100` against this session's own configured
  Atlassian site, got a 404, and correctly fell through to branch/commit
  inference; `branch-pair` → `checkpoint`, auto-confirmed
  `feature/TASK-100-clear-assignee-on-complete` → `main`). Loaded
  `domain-tasks`, `uc-01-create-task`, and `uc-02-complete-task` via the
  `Skill` tool per Step 2. The review correctly flagged the planted
  soft-delete-bypass regression as Critical, with a live repro and citations
  to `architecture.md`, `domain-tasks`, `uc-02-complete-task`, and
  `product.md`; it also noticed the stray `completeTask.feature.js` file via
  `git grep` and correctly reported it as a **Pre-existing (not blocking)**
  note rather than folding it into the numbered findings — exactly the
  behavior Step 7 specifies.
- **`autopilot-full-info`** (run against the shipped, corrected fixture): the
  decision log showed the PR link and requirements text logged verbatim as
  "already provided" (not re-derived or fabricated), and the branch-pair
  checkpoint still fired and auto-confirmed per the skill's "always ask, even
  with a PR link" rule. The review again correctly flagged the same Critical
  regression, with the Coverage line's requirements source correctly reading
  "user-provided" instead of "inferred."
- **`review-the-pr-negative-control`**: run for real through `claude plugin
  eval` (score 1.00) and the trace was read by eye, not just graded — the
  transcript shows exactly one assistant turn, asking Step 0's PR-link
  question verbatim with zero tool calls and zero permission denials
  (`permission_denials: []`), confirming it stopped because Step 0 says to
  stop, not because a tool was denied.

## Known gaps in this suite (by design, not oversight)

- Doesn't cover every possible combination of "PR link given / requirements
  given" independently (e.g. link-only or requirements-only) — the two cases
  here cover "neither given" and "both given," which exercises every
  resolution row in the Autopilot Mode table at least once; the two
  remaining partial combinations would mostly re-exercise the same code
  paths.
- `autopilot-full-info`'s PR link is a fabricated GitHub URL for a repo that
  doesn't exist — `review-the-pr` never actually fetches it (it only pins
  the head commit and carries the string through for citation), so this is
  harmless for this fixture but means the suite doesn't exercise any
  real PR-metadata fetch. Separately, neither verified run's report actually
  echoed the PR link into the Tier-1 output text — the skill's own Step 0
  says to "carry the link into the output," but the Tier-1 report template
  (Output format section) has no field for it, only the reviewed commit
  hash. This gap predates this work; the corresponding grader
  (`autopilot-full-info/graders/review-content.md`, criterion 4) treats it as
  a bonus check, not a PASS requirement, because of this.
- Same environment caveat `go-deep`'s suite notes: tool availability (here,
  whether an issue-tracker MCP is configured) is itself environment-
  dependent; this suite's fixtures are written so the skill's own documented
  fallback (branch/commit inference) is exercised either way.
