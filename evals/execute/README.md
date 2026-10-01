# `execute` autopilot smoke test

Four cases exercising `skills/execute/SKILL.md`'s `--autopilot` flag, against a
tiny hand-authored "tiny-greeter" fixture project standing in for a real
`plan-the-work` output (never chained from a live `plan-the-work` run — see
each case's `fixture/make-it-work/*-plan.md`, authored by hand to look exactly
like what `plan-the-work` would have produced):

- **`execute-negative-control`** — no `--autopilot`. Confirms the interactive
  path still blocks at the Execution Mode question instead of proceeding
  unattended.
- **`execute-stop-at-gate`** — `--autopilot`, fresh plan (`Mode: Not yet
  chosen`, `Progress: Step 0 of 2 complete`). Exercises: the Mode
  `AskUserQuestion`'s `(recommended)`-label resolution to Subagent-Driven; a
  Subagent-Driven dispatch per step with the per-step "reviewed between
  steps" checkpoint auto-confirmed (relay-then-continue, no turn-ending
  pause); the no-test-framework "manual Test Plan walkthrough" step; and
  Phase 4's completion gate, which calls `run-regression full` inline — this
  fixture repo deliberately has no discoverable full-suite command, so the
  run ends in Phase 4's FAIL-equivalent stop (`run-regression`'s own
  "Could not find a full-suite test command..." message), never reaching
  Phase 5.
- **`execute-resume-inline`** — `--autopilot`, a plan already recorded as
  `Mode: Inline`, `Progress: Step 1 of 2 complete` (as if a prior run already
  did Step 1). Exercises: the "Mode already recorded" skip (no Mode question
  asked at all, nothing logged for it); Inline mode's per-step dispatch
  (no `Agent` tool calls, no per-step checkpoint — Inline "runs straight
  through... without pausing between them for review"); and the same
  Phase 4 regression-gate stop as above, reusing the same no-framework
  fixture design.
- **`execute-full-pass`** — `--autopilot`, a fresh plan against a fixture
  that *does* have a configured test framework (`npm test` → `node test.js`,
  pre-committed in a red state exactly as `plan-the-work`'s own per-step
  test-writing sub-phase would leave it). The only case that runs all the
  way through Phase 2's real `**Tests:**` field, a real `run-regression full`
  execution (not just a discovery failure), and Phase 5's terminal success
  report.

## Why this isn't one uniform `claude plugin eval` suite

`execute-negative-control`, `execute-stop-at-gate`, and `execute-resume-inline`
are all plain-`claude plugin eval`-testable — `execute` itself writes nothing
under `.claude/` for its own plan/code output (per the per-skill facts table
in `make-it-work/autopilot-eval-rollout-spec.md` §4, re-verified against the
live `SKILL.md`), and these three cases were specifically designed so that no
step's Verify, and no part of the regression-gate call, ever needs `Bash`:
the fixture repos have no test framework, so each step's "test" is a
code-inspection walkthrough, and `run-regression`'s own discovery fails
*without* ever needing to run anything — it just can't find a command.

```bash
claude plugin eval . --case execute-negative-control --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish
claude plugin eval . --case execute-stop-at-gate --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish
claude plugin eval . --case execute-resume-inline --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish
```

(or `bash evals/execute/run-all.sh`, which runs all three of these plus hands off `execute-full-pass`'s manual steps below.)

(`--case` matches by name glob across the whole `evals/` tree, not scoped per
skill — these three case names are prefixed `execute-` specifically to avoid
colliding with another skill's identically-themed case, e.g.
`evals/go-deep/negative-control`.)

**One caveat even for these three plain-eval cases:** the shared autopilot
convention (`autopilot-eval-rollout-spec.md` §1) fixes the decision log's path
at `.claude/execute-autopilot-log.jsonl`, unconditionally, for every skill —
regardless of whether that skill's *other* outputs touch `.claude/`. Claude
Code treats `.claude/` as a protected path everywhere; no tool grant or
allowlist unblocks writing there outside `--dangerously-skip-permissions`
(confirmed again during this work — see "Known gaps" below). So even these
three plain-eval cases cannot actually verify the log file's own content;
they can only confirm the run didn't derail when that one write was refused.
**Only `execute-full-pass` (below) can verify the log's real content**, since
it already requires the manual bypass path for an unrelated reason (`Bash`).

`execute-full-pass` needs `Bash` — both for a step's own `**Tests:**` command
and for `run-regression`'s real full-suite run — and granting `Bash` to a
`claude plugin eval` case hit this machine's known, unresolved blocker (see
`autopilot-eval-rollout-spec.md` §1.5): a symlink inside the local Docker
credential store (`~/.docker`) makes the Bash sandbox refuse to start at all.
Reproduced again during this work with a throwaway one-tool probe case
(`Bash`-only, `echo hello`) before building any `execute` fixture around it —
identical error, machine-specific, not an `execute` defect. **This case needs
a human to run it** (an agent operating under this harness's own auto-mode
safety net can't invoke or grant `--dangerously-skip-permissions` itself —
same constraint `go-deep`'s pilot hit). Run it via `bash evals/execute/run-all.sh`
(which also runs the three plain-eval cases first), or directly:

```bash
# Set this to this repo's actual path first
REPO_ROOT=/path/to/make-it-work

# Seed the fixture (reuses this case's own fixture.sh) — note the ABSOLUTE
# path: fixture.sh is invoked after cd-ing into $RUN_DIR, so a path relative
# to the repo (e.g. "evals/execute/...") would not resolve there.
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash "$REPO_ROOT/evals/execute/execute-full-pass/fixture.sh")

# Run execute for real
(cd "$RUN_DIR" && claude -p "/make-it-work:execute make-it-work/DEMO-2-plan.md --autopilot" \
  --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
  --output-format stream-json --verbose > /tmp/execute-full-pass-transcript.jsonl)

# Verify: diff git status on the real repo before/after (must be identical —
# run-all.sh does this automatically), then inspect $RUN_DIR's
# src/greeting.js, make-it-work/DEMO-2-plan.md's Execution Status section,
# and $RUN_DIR/.claude/execute-autopilot-log.jsonl by hand. Expect:
# greetFormally added, Mode resolved to Subagent-Driven, Progress "Step 1 of
# 1 complete", a real `npm test` (or `node test.js`) run via run-regression,
# Gate result: PASS, and Phase 5's final success report ("Changes are
# uncommitted in the working tree — review and commit when ready.").
```

The `graders/*.md` files in each case directory still document exactly what
"correct" looks like (structure, decision-log schema, which files must
change) — useful as a checklist even when a case is run manually rather than
through the eval harness's scoring.

## What was actually run and verified (not just graded)

All three plain-eval cases were run for real via `claude plugin eval`
(`--scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin
--no-publish`, score 1.00 on all graders for all three) — not merely written
and assumed correct. `execute-stop-at-gate` and `execute-resume-inline`'s full
trace.jsonl were additionally read end to end by eye (`--keep-temp`, then
`chmod 700` the kept sandbox per the harness's own instructions), the same
level of verification go-deep's `fresh-onboarding`/`repair-path` manual runs
got. Confirmed, directly from the transcripts and the resulting files (not
inferred from grader output alone):

- **`execute-stop-at-gate`:** the Execution Mode `AskUserQuestion` payload was
  constructed internally but never actually called — autopilot resolved it
  straight to Subagent-Driven (the `(recommended)` label) without pausing.
  The plan file's `## Execution Status → Mode` line was rewritten to
  `**Mode:** Subagent-Driven — dispatch a fresh subagent per step (via the
  Agent tool), reviewed between steps.`, exactly the fixed string Phase 0
  point 3 specifies. Two `Agent` dispatches occurred (one per step), each with
  a condensed paraphrase of Phase 1's policy in its prompt (retry limit,
  guardrail, halt scope, never-git-commit) rather than the verbatim-in-full
  text Phase 2's "Dispatch mechanics" section calls for — **this is a
  pre-existing gap in `execute`'s own Phase 2 instructions, not something
  this autopilot work introduced or fixed**; see the open finding in the
  main report. Each dispatch was followed by a relayed report in chat
  before the next was dispatched — the per-step
  "reviewed between steps" checkpoint, auto-confirmed without ending the
  turn. `src/greeting.js` was correctly updated: `greetFormally` added,
  returning `"Good day, <name>."`, `greet` unchanged. `## Execution Status →
  Progress` reached `Step 2 of 2 complete`. `run-regression` was invoked via
  the `Skill` tool with `args: "full"` (never `--autopilot` appended), and
  its own discovery genuinely found no full-suite command for this fixture
  (no `package.json`, `Makefile`, or CI config) — producing exactly
  `run-regression`'s fixed stop message, which `execute`'s Phase 4 then
  relayed verbatim and treated as a FAIL-equivalent stop. Phase 5's terminal
  success report was correctly never printed. The
  `.claude/execute-autopilot-log.jsonl` write was refused by the sandbox
  (expected); the model noticed the refusal, said so plainly in its summary
  instead of silently dropping it, and the run still reached its correct
  terminal state.
- **`execute-resume-inline`:** no Execution Mode question was asked at all
  (Mode was already `Inline` from the fixture) — confirmed zero `Agent` calls
  and zero `AskUserQuestion` calls in the trace. Step 2 (the manual Test Plan
  walkthrough) was performed directly in-session, Progress reached `Step 2 of
  2 complete`, and the same `run-regression`-discovers-nothing stop fired at
  Phase 4. The model explicitly reasoned that the decision log would have had
  zero lines this run (nothing was actually decided), which matches this
  skill's own documented convention.
- **`execute-negative-control`:** `Write`, `Edit`, `Agent`, and `Skill` were
  all granted (not withheld) specifically so a "stop" here would mean the
  skill actually chose to stop, not merely that it lacked the tools to do
  anything else. Re-read in full: `AskUserQuestion` itself is unavailable in
  this sandbox (confirmed via a `ToolSearch` the model issued trying to find
  it), so the model explicitly said so and fell back to asking the Execution
  Mode question in plain chat text — then genuinely stopped and waited,
  never touching `Edit`/`Write`/`Agent` despite having them available.
  `src/greeting.js` untouched, plan file's Mode/Progress lines unchanged.
  **Finding:** `AskUserQuestion`'s unavailability in this sandbox (the same
  environment-dependent gap `go-deep`'s suite already documented) is real,
  but `execute`'s interactive path degrades correctly rather than silently
  proceeding — worth a `SendFeedback` note on the harness, not a defect in
  this skill.

`execute-full-pass` (the `Bash`-dependent case) was not run by this agent —
see the hand-off below — but its fixture's red state was independently
verified by directly running `node test.js` against it (fails as expected:
`greetFormally` undefined) before ever invoking `execute` against it.

## Decisions made while implementing this skill's autopilot support

- **Phase 0.3's Subagent-Driven-vs-Inline choice was formalized as a real
  `AskUserQuestion`** (2 options, `(recommended)` on Subagent-Driven), not
  left as plain text. Reasoning: the skill's own prose already frames it with
  the same shape every other formal `AskUserQuestion` site in this plugin
  uses — a short, fixed set of mutually exclusive options with one
  `(recommended)` — so formalizing it lets the existing resolution policy
  (`(recommended)` label → choose it) apply directly, with no new, bespoke
  resolution rule needed just for this one site.
- **No destructive-action analog exists in this skill** (confirmed against
  the live `SKILL.md`, matching the facts-table survey) — `execute` never
  deletes or overwrites user content beyond the plan file's own bookkeeping,
  and it never runs `git commit`. Four sites nonetheless remain unconditional
  stops under `--autopilot` because they are missing-input problems, not
  because they're destructive: ambiguous repo/workspace selection among
  unrelated clones, "Could not identify the project root", an underivable
  ticket key/plan path, and "No plan found...". None of these needed a
  product-decision call on my part — there is no sensible default to invent
  for any of them (you cannot guess which of several unrelated repos is
  correct, or guess a ticket key that was never given), so they stay stops
  under both modes, the same way they already were interactively.
- **The per-step "reviewed between steps" checkpoint under Subagent-Driven
  mode is resolved as "relay the report, then continue in the same turn"**,
  not as a traditional pause-and-wait checkpoint — because in an unattended
  or headless invocation, ending the turn to wait for a reply would hang the
  run forever with nobody to answer. This is called out explicitly in the
  resolution table rather than left to be inferred from the generic
  "checkpoint → auto-confirm" rule.

## Known gaps in this suite (by design, not oversight)

- **The decision log's per-step `step-review` lines (one appended per step
  under Subagent-Driven mode) cannot be verified via plain `claude plugin
  eval`.** Confirmed empirically: in `execute-stop-at-gate`'s real run, the
  very first attempted `Write` to `.claude/execute-autopilot-log.jsonl` (the
  `mode-choice` line) was denied by the sandbox, and no further attempt to
  write/append that file appears anywhere later in the trace — only the first
  site's attempted payload is ever observable in this sandbox (graded by
  `execute-stop-at-gate/graders/attempted-log-payload.md`, which checks that
  one payload's content). **The cause is undetermined** — this run doesn't
  distinguish "the model judged a second attempt futile after the first
  refusal" from "the per-step append instruction simply wasn't followed" —
  and SKILL.md's instruction to append one `step-review` line per step is
  unverified by this sandbox either way. The full `M`-steps-worth of
  `step-review` lines can only be verified where the write genuinely
  succeeds — `execute-full-pass`'s manual run, via
  `graders/decision-log-content.md`'s item 5 (now a required check, not a
  conditional one).
- Doesn't cover Phase 1's guardrail or 5-attempt retry limit — these are
  correctness halts, not autopilot-resolved interactive points (autopilot
  does not change their behavior at all; see `SKILL.md`'s Autopilot Mode
  section, "Not autopilot-governed at all"), and reproducing a genuine
  test-vs-product-behavior discrepancy or a 5-attempt failure deterministically
  in a tiny fixture adds a lot of fixture complexity for a smoke suite whose
  job is confirming the *interactive-point* resolution policy, not
  re-verifying Phase 1's own already-documented logic.
- Doesn't cover the four unconditional-stop sites named above (ambiguous
  repo, missing project root, underivable ticket key, "No plan found") —
  each is a flat stop-and-tell with no option set to resolve, identical under
  both modes, so there is no autopilot-specific behavior to exercise.
- Doesn't cover a multi-repo workspace plan, or the scoped-mode branch of
  Phase 4's completion gate (today unreachable in practice per `SKILL.md`'s
  own Phase 4 "Resolving scope" section, since no current `plan-the-work`
  output ever populates a "Domains/UCs Touched" field).
- `execute-full-pass` depends on `node` being on `PATH` wherever it's run
  manually — a dependency of this fixture's chosen tiny test framework, not
  of `execute` itself.
- As with `go-deep`'s suite, `AskUserQuestion`'s own availability is itself
  environment-dependent inside a `claude plugin eval` sandbox; `execute`'s
  negative-control case grades on the model's own printed question text
  (which still gets produced even if the underlying tool call is
  unavailable), not on a `tool_used: AskUserQuestion` assertion.
- Six other agents were modifying sibling skills (`close-the-gaps`,
  `define-test-strategy`, `plan-the-work`, `review-the-pr`, `run-regression`,
  `slice-the-epic`) concurrently with this work, each possibly running
  `claude plugin eval` at the same time. If a `claude plugin eval` run shows
  an odd sandbox/lock failure unrelated to `execute`'s own logic, consider
  that contention before treating it as a defect in this suite.
