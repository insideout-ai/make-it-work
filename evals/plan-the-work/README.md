# `plan-the-work` autopilot smoke test

Five cases exercising `skills/plan-the-work/SKILL.md`'s `--autopilot` flag:

- **`negative-control`** — no `--autopilot`; confirms a hard-stop site (the mid-refinement
  questions-file checkpoint) still blocks in the interactive path.
- **`plan-collision-negative-control`** — no `--autopilot`, same fixture as `plan-collision` below.
  This is the case that actually discriminates the flag itself: it proves the collision-handling
  behavior `plan-collision` exercises under `--autopilot` is genuinely gated by the flag, not
  always-on regardless of it.
- **`happy-path`** — autopilot, no test framework configured in the fixture repo. Exercises the
  Step 4.5 `AskUserQuestion` "how"-gap resolution (an `Approach` gap, deliberately planted in the
  fixture's spec) and a full run through to Step 6's final output.
- **`plan-collision`** — autopilot, with a pre-existing `make-it-work/DEMO-300-plan.md` already in
  the fixture. Exercises the one named hard-stop exception: autopilot must never overwrite an
  existing plan file, and resolves the collision by writing to a `-v2` suffix instead.
- **`with-tests`** — autopilot, with a real configured test framework (Node's built-in
  `node --test`) in the fixture. Exercises Step 5's per-step test-writing sub-phase: running the
  regression baseline, writing a progression test, confirming it fails for the right reason, and
  committing it with `git commit -m "test: step <N> — ... (red state)"`.

## Why `negative-control` alone doesn't prove the flag matters (and why `plan-collision-negative-control` does)

`negative-control`'s site (the mid-refinement questions-file checkpoint) is designed, per this
skill's Autopilot Mode table, to **remain a hard stop even under `--autopilot`** — the skill's own
recommended default there is to halt, and autopilot honors that literally (see "Design decisions"
below). That means a `plan-the-work` with a hypothetical bug that *always* behaves as if
`--autopilot` were passed would still pass `negative-control` — it would still halt at that site
either way. `negative-control` is still worth keeping (it proves that specific hard-stop holds), but
it cannot by itself prove the flag changes anything.

`plan-collision-negative-control` closes that gap: it runs the exact same fixture as
`plan-collision` (a pre-existing, sentinel-marked plan file) but **without** `--autopilot`, and
asserts the opposite outcome — no `-v2` file gets created, the original stays untouched, and the
run instead surfaces the overwrite/new-file/abort question and stops. Verified for real (see below):
the interactive run genuinely asks the three-way question and never resolves it on its own. Together
with `plan-collision`'s passing `-v2`-resolution-under-autopilot graders, this is a real
flag-on/flag-off comparison at the same site.

## Running everything

```
bash evals/plan-the-work/run-all.sh
```

`negative-control`, `plan-collision-negative-control`, `happy-path`, and `plan-collision` run fully
automatically via `claude plugin eval`. `with-tests` needs real `Bash` (git commit, running the
fixture's test suite) and currently cannot run through `claude plugin eval` on this machine (see
below) — `run-all.sh` runs it manually via `--dangerously-skip-permissions`, the same way
`evals/go-deep/run-all.sh` runs its two manual cases. Run `run-all.sh` yourself (via `!` in a Claude
Code session, or directly in a shell/CI) — not something to hand to an agent, for the same reason
`evals/go-deep/README.md` gives: an agent operating under this harness's own auto-mode safety net
can't invoke or grant itself `--dangerously-skip-permissions`.

## Why `plan-the-work` needed less manual-bypass treatment than `go-deep`

`plan-the-work` writes nothing under `.claude/` of its own accord — its real output is
`make-it-work/<TICKET>-plan.md` (plus, in Step 5's test-writing sub-phase when a test framework is
configured, test files and a git commit). The **only** thing this rollout adds under `.claude/` is
the autopilot decision log itself, `.claude/plan-the-work-autopilot-log.jsonl` (per the shared
spec's §1 convention) — so `plan-the-work` falls into the spec's §2 middle category ("one specific
blocked path among otherwise-unblocked output"), the same category `define-test-strategy` is in
for its `testing-strategy.md`.

Verified directly (ran `happy-path` and `plan-collision` for real, via plain `claude plugin eval`,
and read both full transcripts): in both runs, the model attempted the `Write` to
`.claude/plan-the-work-autopilot-log.jsonl`, got a permission-denied result, did **not** retry or
stall, explicitly said so in its final chat summary ("the on-disk decision log ... couldn't be
written — permission denied for `.claude/` under the current mode — so recording here instead"),
and then correctly continued to a complete, correct plan file. So a single blocked `.claude/` write
does not derail the rest of an autopilot run here — it degrades gracefully, exactly the way the
spec's §2/§3-step-7 guidance expects.

**The decision log's *content* (not just its on-disk existence) is actually verifiable through plain
`claude plugin eval`, not just the manual path** — a correction from an earlier draft of this
README. The attempted `Write` tool call's full `content` argument (the JSONL line(s) the model tried
to persist) is captured in the run's own trace even though the write itself is denied. `happy-path`
and `plan-collision` both carry trace-regex graders (`filler-label-preserved-not-chosen.md`,
`filler-never-chosen.md`, `recommended-option-chosen.md`, and, for `plan-collision`,
`collision-decision-logged.md`) that check this directly — confirmed matching against both real
runs' traces before being added. **Only the log file's on-disk persistence** (does
`.claude/plan-the-work-autopilot-log.jsonl` actually get written, with correct permissions, at the
real repo-root path) needs the manual `--dangerously-skip-permissions` path below.

```bash
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash /Users/ErezMo/make-it-work/evals/plan-the-work/happy-path/fixture.sh)
(cd "$RUN_DIR" && claude -p "/make-it-work:plan-the-work DEMO-200 --autopilot" \
  --plugin-dir /Users/ErezMo/make-it-work --dangerously-skip-permissions \
  --output-format stream-json --verbose > /tmp/transcript.jsonl)
# then inspect $RUN_DIR/.claude/plan-the-work-autopilot-log.jsonl by hand.
```

(Swap in `plan-collision/fixture.sh` and ticket `DEMO-300` to check that case's log file instead.)
This is now genuinely optional — the plain-`claude plugin eval` run's trace-based graders already
prove the log's content and schema correctness; only its physical persistence is left unverified
without the manual path.

## Why `with-tests` needs the manual path — and it's a *different* reason than `go-deep`'s

This is **not** the `.claude/`-protection story above. Step 5's test-writing sub-phase, when a test
framework is configured, runs the fixture's actual test command and commits via real `git` — both
need `Bash`. Granting `Bash` to a `claude plugin eval` case hits the exact, separate, known blocker
the spec's §1.5 flags from the `go-deep` work: on this machine, `claude plugin eval` refuses to run
*any* `Bash`-granting case at all, citing a symlink inside the local Docker credential store
(`~/.docker`). Confirmed directly (not assumed) before building this case's fixture — a minimal
probe case that just asked the model to run `pwd` via `Bash`, granted `--allow-tools Bash`, via
plain `claude plugin eval`, failed immediately with:

```
the Docker (~/.docker, DOCKER_CONFIG) credential store on this machine holds a symbolic link
inside it, so the Bash sandbox cannot reliably exclude it — a Bash-granting evaluation cannot
run here; keep the store's contents in one plain directory (its root may be a link)
```

This is specific to this one machine's Docker config (per the spec, never resolved during the
`go-deep` work either) — not a defect in `plan-the-work` or this eval suite, and not something to
chase here. A different machine or CI runner without that symlink could plausibly run `with-tests`
through plain `claude plugin eval --allow-tools Bash` directly; this suite instead routes it
through `--dangerously-skip-permissions`, which bypasses `claude plugin eval`'s OS sandbox (and,
incidentally, also unblocks the `.claude/` decision-log write for this one case, so
`with-tests/graders/autopilot-log-exists.md` can actually be checked against a real run).

One more thing worth knowing before trusting any `claude plugin eval --allow-tools Bash` result
elsewhere in this plugin's eval suites on this machine: with up to 6 other skills' eval suites
potentially running `claude plugin eval` concurrently in this same working tree, an unrelated
`Bash`-sandbox or lock failure here may be this same machine-specific Docker issue resurfacing
under load rather than a new defect — don't chase it as one without first checking for this exact
error message.

**Important — `negative-control`-family cases need `Bash` too, in principle, and still work in
plain `claude plugin eval` here.** Unlike `go-deep`, `plan-the-work`'s Step 1a instructs running
`pwd` to establish the workspace layout, which looked at first like it might force *every* case —
including the no-autopilot cases — onto the manual path. Verified directly across all four
plain-eval cases (no `Bash` granted to any of them): the model used `Glob`/`Read` against its own
already-known cwd instead of literally invoking `pwd`, correctly identified the single-repo layout
every time, and proceeded normally from there. So none of the four plain-eval cases actually need
`Bash` in practice on this model/harness combination — only `with-tests`' real test-execution +
git-commit step does.

## Case-by-case notes

### `negative-control`

Fixture: a single-repo project with `make-it-work/DEMO-100-questions.md` present and still
`**Status:** Awaiting Answers` (an unanswered `close-the-gaps` offline export), no
`DEMO-100-spec.md`. Invoked without `--autopilot`.

The skill's Step 1b hits this exact checkpoint early (right after Step 1a's repo-layout check,
before any code investigation) and is required to stop regardless of autopilot: "Do not continue
past this check silently." That makes it a clean, fast, fully-deterministic site to confirm the
hard stop holds — no dependence on `AskUserQuestion`'s availability inside a `claude plugin eval`
sandbox (which `evals/go-deep/README.md` notes is itself environment-dependent), since this
checkpoint is a plain-text pause, not a tool call. (See "Why `negative-control` alone doesn't prove
the flag matters" above for why this case doesn't by itself prove `--autopilot` changes behavior.)

Graders: `make-it-work/DEMO-100-plan.md` must **not** exist (Step 4's skeleton write happens after
this checkpoint, so a genuinely-blocked run never creates it), and the trace must contain
`mid-refinement` (the word `plan-the-work` uses when it surfaces this exact situation).

Verified for real: ran via plain `claude plugin eval`, read the full trace. The model investigated
with `Glob`/`Read` only (no `Bash`), found the unanswered questions file, and stopped with exactly
the two-option prompt the skill specifies (stop-and-finish-`close-the-gaps` vs. proceed-anyway),
never writing a plan file. Both graders passed.

### `plan-collision-negative-control`

Fixture: identical to `plan-collision` below (a pre-existing, sentinel-marked
`make-it-work/DEMO-300-plan.md`). Invoked **without** `--autopilot`.

Graders: `make-it-work/DEMO-300-plan-v2.md` must **not** exist; the original file's sentinel must
still be present (untouched); the trace must contain "overwrite" (case-insensitive) — the word the
interactive collision question uses.

Verified for real: ran via plain `claude plugin eval`, read the final message in the trace. The
model's last message was:

> I found an existing plan file at `make-it-work/DEMO-300-plan.md` from a previous run (it's
> explicitly marked stale/placeholder). Before I write the real plan, how would you like to handle
> it?
>
> 1. **Overwrite** `make-it-work/DEMO-300-plan.md` with the new plan
> 2. **Write to a new file** `make-it-work/DEMO-300-plan-v2.md`, leaving the old one untouched
> 3. **Abort** this planning run
>
> ... Let me know your choice on the file collision and I'll proceed.

— i.e. it genuinely stopped and asked, never auto-picking option 2 the way `plan-collision` (with
`--autopilot`) does. All 3 graders passed.

### `happy-path`

Fixture: a single-repo project with a `close-the-gaps`-style `make-it-work/DEMO-200-spec.md`
(`**Status:** Answered`) whose "Open implementation note" deliberately leaves an `Approach` gap
open — two existing cross-cutting patterns already coexist in the fixture's source
(`src/events/taskEvents.js`'s event-based pattern vs. `src/notifications/sendReminder.js`'s direct
field-read pattern), and the spec doesn't say which one a new "snooze" feature should extend.
`package.json`'s `test` script is the unmodified npm placeholder (no framework configured).
Invoked with `--autopilot`.

Graders: the plan file exists; an `llm` grader on the plan file confirms the `## Decision Log` has
a resolved, concrete `Approach` row (not the `"Proceed with the recommended assumption"` filler),
the `## Approach` section is consistent with it, there are no placeholder anti-patterns, and
`## Execution Status` is untouched from the skeleton; a trace regex confirms the run never printed
either of the skill's two interactive-pause phrasings (`"Which do you want?"` /
`"Want that?"`); another trace regex confirms Step 6's `Recommended executor tier` final-summary
line was printed; three more trace-regex graders confirm the attempted decision-log entry's schema
directly (filler label preserved verbatim, filler never the `chosen` value, a `(Recommended)`-suffixed
option actually chosen).

Verified for real: ran via plain `claude plugin eval`, **read the complete generated plan file**
(not just the grader's pass/fail). It correctly resolved the planted `Approach` gap (chose the
direct-field pattern, matching the option it labeled `(Recommended)`, with a substantive
alternatives-considered paragraph in `## Approach`), and — unplanted by this suite, an emergent
correct behavior — it also detected a second real gap this fixture creates incidentally (no test
framework configured) and logged it as its own `Missing prerequisite` Decision Log row, picking
Node's built-in test runner. `## Execution Status` was left exactly as the skeleton template
specifies (`Mode: Not yet chosen`, `Progress: Step 0 of 5 complete`). The plan has zero
placeholders, concrete file/function names throughout, and a correct `## Test Plan` /
`### Step 5 — Write tests` fallback (since no framework exists). All 7 graders passed.

### `plan-collision`

Fixture: a single-repo project with `make-it-work/DEMO-300-spec.md` (a small, low-ambiguity ticket
— add a `cancelTask` function) **and** a pre-existing `make-it-work/DEMO-300-plan.md` already
present, containing a distinctive sentinel comment and placeholder content marking it as stale.
Invoked with `--autopilot`.

Graders: `make-it-work/DEMO-300-plan-v2.md` exists; the original `DEMO-300-plan.md` still contains
its sentinel string unmodified (proves it was never touched, let alone overwritten); an `llm`
grader on the `-v2` file confirms it's a genuine fresh plan for the real ticket, not a copy of the
stale placeholder; a trace regex confirms the printed `execute` hint names the resolved path in
context — `execute make-it-work/DEMO-300-plan-v2\.md`, deliberately tighter than a bare
`DEMO-300-plan-v2\.md` match (which would trivially pass from the `Write` tool call's own
`file_path` argument alone, without actually checking the printed hint text); plus the same three
decision-log-schema trace graders `happy-path` has, and one more
(`collision-decision-logged.md`) matching the exact `existing-plan-collision` log line.

Verified for real: ran via plain `claude plugin eval`, read the full generated `-v2` plan content
(embedded in the `llm` grader's evidence) and the trace's decision-log `Write` attempt. The model
detected the collision at Step 4, chose `"write to make-it-work/DEMO-300-plan-v2.md"` (never
"overwrite", never "abort"), left the original file's sentinel and stale-marker text completely
intact, and produced a complete, correct, placeholder-free plan for the real ticket at the `-v2`
path, printing `Run /make-it-work:execute make-it-work/DEMO-300-plan-v2.md` (not the bare ticket
key) in its final summary. All 9 graders passed.

### `with-tests`

Fixture: a single-repo project with `make-it-work/DEMO-400-spec.md`, a currently-passing regression
test (`src/tasks/createTask.test.js`), and a real configured test framework (`"test": "node
--test"` — Node's built-in runner with its default recursive test-file discovery, chosen so the
fixture needs no `npm install`/network access).  Invoked with `--autopilot`.

**Dry-run verified directly** (not through the skill — just the fixture itself, run with plain
`node`/`npm` inside a `mktemp -d` scratch directory, never the real repo): the original
`package.json` test script was `"node --test src"`, which on this machine's Node version (v23.9.0)
fails outright — `node --test <dir>` treats a bare directory argument as a CommonJS module to
`require()`, not a search path, and errors with `MODULE_NOT_FOUND`. Fixed to plain `"node --test"`
(no path argument), which correctly auto-discovers `**/*.test.js` recursively. Re-verified after the
fix: the baseline (`npm test`) passes 2/2; appending a whitespace-title test (matching the ticket's
AC1) correctly fails for the right reason (`AssertionError: Missing expected exception`) against the
current, unmodified `createTask` — confirming this fixture's progression-red premise is real, not
just assumed.

Graders (checked by hand against a manual run — not run through `claude plugin eval`, see above):
a trace regex for the exact `test: step <N> — ... (red state)` commit-message format Step 5's
sub-phase point 7 requires; a regex on `src/tasks/createTask.test.js` confirming a new
whitespace-related test was actually added; an `llm` grader on the plan's `**Tests:**` field for
that step, confirming it names the real file/command and a correctly-reasoned progression-red state
(this is a **Modify** row — `createTask` already exists and runs — so no stub signature should be
written, and the red state should come from the new assertion failing against the *current*
implementation); and the `.claude/plan-the-work-autopilot-log.jsonl` existence check, which only a
`--dangerously-skip-permissions` run can satisfy.

**Not yet run for real** — this needs a human (or a different machine/CI) to invoke
`--dangerously-skip-permissions` manually, per `evals/go-deep/README.md`'s established reasoning:
an agent operating under this harness's own auto-mode safety net can't invoke or grant itself that
flag. Exact command (also in `run-all.sh`, with the path bug the first draft of this README had —
`cd "$RUN_DIR" && bash evals/...` with a relative path, which cannot resolve once cwd has
changed — already fixed below to use the absolute repo path):

```bash
RUN_DIR=$(mktemp -d)
(cd "$RUN_DIR" && bash /Users/ErezMo/make-it-work/evals/plan-the-work/with-tests/fixture.sh)
(cd "$RUN_DIR" && claude -p "/make-it-work:plan-the-work DEMO-400 --autopilot" \
  --plugin-dir /Users/ErezMo/make-it-work --dangerously-skip-permissions \
  --output-format stream-json --verbose > /tmp/plan-the-work-with-tests-transcript.jsonl)
```

Then check: `make-it-work/DEMO-400-plan.md`'s `**Tests:**` field for the step that changes
`createTask`; `git log` in `$RUN_DIR` for the `test: step ... (red state)` commit and that it only
touches the test file (no stub — this is a Modify row); that `npm test` run in `$RUN_DIR` **fails**
on the new whitespace-title test by design at that point (2 original tests passing, the new one
red) — it should only turn fully green once a later `execute` step actually implements the trimming
behavior, which this plan does not do; and `$RUN_DIR/.claude/plan-the-work-autopilot-log.jsonl`
against the schema in `skills/plan-the-work/SKILL.md`'s Autopilot Mode section. As always, diff
`git status` on the real repo before/after and confirm it's unchanged.

## Design decisions made during this rollout (confirm if you disagree)

- **Existing-plan-file collision → `-v2` suffix, next-free-suffix if that's also taken.** The
  spec's §5 caution flags this as needing confirmation rather than a silent assumption. `-v2` is
  literally what the spec itself suggests as "a reasonable non-destructive choice," and
  `plan-collision`'s graders confirm it works correctly end-to-end, with `plan-collision-negative-control`
  confirming the flag genuinely gates it — but the choice of `-v2` itself (vs., say, a timestamp
  suffix, or requiring a human the first time regardless) has not been separately confirmed by a
  human reviewer. If a different default is preferred, `skills/plan-the-work/SKILL.md`'s Autopilot
  Mode section and these two cases are the places to change.
- **Mid-refinement questions-file checkpoint → remains a hard stop, even under `--autopilot`.**
  The skill's own text designates "stop here and finish `close-the-gaps` first" as the recommended
  choice at this site; autopilot honors that designated default literally (it does not reinterpret
  "checkpoint → auto-confirm" as "proceed anyway" here, since the recommended default itself is to
  halt).
- **Scope-check checkpoint (Step 1a: spec covers 2+ independent subsystems) → auto-confirm/proceed
  unsplit, not a hard stop.** The skill's interactive text actually says to *stop*, suggest
  splitting the spec into one plan per subsystem, and wait for the user to confirm before
  continuing — it does not describe "proceed as one plan" as its own default. Autopilot's current
  policy (general `checkpoint → auto-confirm, proceed` rule applied here) does the opposite of that
  stop: it proceeds unsplit without ever surfacing the split suggestion. No case in this suite
  exercises this site (it would need a spec deliberately spanning two unrelated subsystems), so this
  is **documented but unverified by a real run**, and — like the `-v2` choice — is a judgment call
  that hasn't been separately confirmed by a human reviewer. Three real alternatives exist: keep
  the current policy (proceed unsplit, record the multi-subsystem shape as an Assumption), make it
  a hard stop like the mid-refinement site, or have autopilot actually perform the split into
  multiple plan files on its own.
- **Filler label `"Proceed with the recommended assumption"` is preserved verbatim** (not renamed
  to another skill's convention) and is never auto-selected — autopilot always has a concrete
  `(Recommended)`-labeled option to pick instead, per this skill's own question-construction rule.
  Verified directly against both `happy-path` and `plan-collision`'s real traces.

## Known gaps in this suite (by design, not oversight)

- Doesn't cover every Step 4.5 gap type (Scope boundary, Data/migration, Backward compatibility,
  Sequencing/rollout) individually — only `Approach` and one incidental `Missing prerequisite` are
  exercised, both via `happy-path`. All of them resolve through the same `(Recommended)`-label
  mechanism, so this is a coverage gap in breadth, not a mechanism left unverified.
- Doesn't cover the ambiguous-workspace-root hard stops (Step 1a cases 2/3) or the no-derivable-
  ticket-key hard stop (Step 1b) — these are unchanged by `--autopilot` (see the Autopilot Mode
  resolution table), so they're lower-value to fixture here than the sites `--autopilot` actually
  changes.
- Doesn't cover the Step 1a scope-check site with a real run either way (see "Design decisions"
  above).
- `with-tests` has not been run end-to-end yet (see above) — only `negative-control`,
  `plan-collision-negative-control`, `happy-path`, and `plan-collision` have real, verified runs
  behind their passing graders. Its fixture's own correctness (baseline green, progression genuinely
  red) was separately dry-run-verified directly with `node`/`npm`, independent of the skill.
- The mid-refinement hard-stop *under* `--autopilot` (the "Design decisions" entry above) is
  documented in `skills/plan-the-work/SKILL.md`'s resolution table but never exercised by a real
  autopilot run in this suite — `negative-control` exercises it without `--autopilot`, which is a
  different code path. Adding a dedicated short autopilot case for this site (fixture:
  `happy-path`'s fixture plus an unanswered `<TICKET>-questions.md`) would close this gap; it wasn't
  added here as a late addition given time spent already verifying the other sites.
- **Cross-skill note, not specific to `plan-the-work`:** across three real runs, the model
  represented a logged `askUserQuestion` entry's `options` array in two different valid shapes —
  objects (`{"label": "...", "description": "..."}`) in two runs, plain strings in a third. The
  Autopilot Mode section's schema note ("the exact constructed payload") doesn't pin this down, and
  neither does `go-deep`'s identical wording for its own decision log. This suite's graders were
  written to tolerate both shapes rather than assume one; worth a look if a future skill's
  autopilot-log grading needs to inspect `options` structurally rather than just confirm text
  survives verbatim within it.
