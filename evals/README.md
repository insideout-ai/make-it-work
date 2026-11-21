# Running this plugin's eval suites

## Maintainer runs for pull requests and releases

Use an installed, signed-in Claude Code. CI runs deterministic checks only; no
API key, CI credential, recurring job or live-model schedule is created here.

| Run | Purpose | Default execution / reported-usage cap |
| --- | --- | --- |
| `smoke` | One representative case per public skill; once when each PR is ready | All selected cases concurrently / $12 |
| `critical` | On demand only: explicit cross-stage and failure/resume contracts | Up to 3 concurrently / $20 |
| `extended` | On demand only: remaining behavioral scenarios and focused batches | Sequential / $12 |
| `full` | On demand only: every discovered case, including maintenance cases | Sequential / $45 |

Finish implementation, review fixes and deterministic checks before smoke.
Open a draft PR first; run the complete smoke inventory once, immediately before
marking that PR ready. If it fails, fix and commit the affected changes, then use
`--retry-failed`. Only failed or unfinished cases run; passing cases are retained.
Ready-for-review and merge require passing evidence for every smoke case across
the initial report plus retries. Do not demand another complete all-green run.
Do not launch smoke on pushes, intermediate edits or review iterations.

Smoke is the only required model-evaluation tier for releases. Reuse the release
PR's smoke sequence and [the release checklist](../docs/eval-release-checklist.md);
do not start another full smoke run because of a version bump or release.
Smoke evidence records each case's tested source commit; cumulative coverage
does not mean every case was rerun on the final commit.

`critical`, `extended`, `full`, and focused model cases run only on an explicit
maintainer request. A version bump, release, changed skill, or checklist does not
authorize them. Missing results from these on-demand tiers do not block a release.
Existing deterministic checks and packaging validation remain unchanged. An
observed, confirmed relevant behavior defect still requires resolution; this
policy does not turn a known failure into a pass.

```sh
node evals/validate.mjs
node evals/catalog.mjs                   # every case, tier, disposition and check count
node evals/catalog.mjs --json            # includes each actual grader requirement
node evals/run-suite.mjs smoke --dry-run
node evals/run-suite.mjs smoke --pr=123 --ready
node evals/run-suite.mjs smoke --pr=123 --ready --retry-failed  # after fixing failures
node evals/run-suite.mjs critical
node evals/run-suite.mjs full --skill=execute --dry-run
node evals/run-suite.mjs full --case=execute-resume-inline
node evals/run-suite.mjs extended --shard=1/4 --max-cost-usd=12
```

Smoke requires `--pr=NUMBER --ready` and a clean committed checkout. Its first
run covers the entire inventory; `--case`, `--skill` and `--shard` are rejected
for paid smoke. `--dry-run` remains free and does not reserve a run. Use
`full --case=NAME` for a necessary development diagnostic.

The runner stores a per-PR ledger in `git rev-parse --git-common-dir` under
`miw-smoke/`. It reserves the initial run before model execution, refuses a second
full run even on a later commit, blocks concurrent attempts, and automatically
selects unresolved cases on retries. A crash or authentication failure does not
permit a fresh full run: resume with `--retry-failed`. Each completed case is checkpointed; an interrupted attempt leaves only cases
without a passing checkpoint unresolved. Inventory changes
fail closed for manual investigation. Do not delete the ledger to repeat smoke.
If a killed process leaves a `.lock` directory, verify that process has stopped
before removing only that lock; retain the JSON ledger.

Worktrees share the ledger; separate clones and machines do not. Coordinate one
smoke owner per PR and include every report in its description. These are local
spending safeguards, not server-side proof or a configured GitHub merge gate.


For non-smoke tiers, repeat `--case` or `--skill` for several selections; filters intersect, not union.
Select dependent skills explicitly. Empty/unknown selections fail before login
or model calls. Stable `I/N` shards partition the filtered list in catalog order;
run all shards against the same commit and selection to cover that inventory.
Do not equate one shard with a full tier pass. No automatic schedule is installed;
maintainers can rotate these batches during normal maintenance.

Non-smoke runs accept `--concurrency=1` through `4`; smoke accepts up to `15`.
The runner divides each wave's remaining budget among its active cases, including
grading. Unused per-case shares cannot move during a wave. An incomplete or
budget-exhausted case is never a passing case. Use `--max-cost-usd=N` to select a
cap appropriate to the chosen cases, and inspect `--dry-run` before spending.
Recent full smoke runs reported $4.52 and $5.16; these are observations, not
promised future usage. The old 45-case archive estimate is obsolete.

## Maintenance and failure ownership

`suites.json` explicitly names critical cases and their purpose. Smoke membership
stays one case per public skill. `extended` is the remaining inventory; `full`
keeps every `case.yaml`, even when its grader needs repair. New cases start
outside the curated smoke/critical inventories until their contract, evidence
and baseline are reviewed. Critical remains on-demand; adding a case to it does
not add a release gate.

The [audit record](AUDIT.md) distinguishes retention from reliability. Maintenance
entries carry a disposition, reason, owner and follow-up. A case marked repair,
investigate, consolidate or retire cannot be silently promoted into smoke or
critical. A known issue retained in one of these inventories must be explicitly
marked `blocking: true`; its failure prevents a passing verdict for that selected
tier. This metadata does not require running critical for a release. Repair
means fix and rerun when authorized, not accept a failing verdict. No case has
been deleted or declared irrelevant merely because it failed once.

Reports retain the original passed/failed result and add `failureCategory`:
- `budget`: the execution or grader exhausted its allowance;
- `infrastructure`: authentication, setup, execution timeout/turn limit or process failure;
- `grader`: an identified grader process/evidence error;
- `unclassified`: an assertion failed and requires diagnosis.

A failing LLM vote or regex is initially unclassified. Read the fixture,
requirement, actual artifact and transcript before assigning behavior or grader
ownership; record the evidence-backed disposition beside the ignored report.
The runner does not auto-excuse a failure or infer causality from changed files.
Passing reports use a null category. Partial selections record their explicit
case list, filters, source commit and completion state; a standalone passing subset never
certifies the parent suite. The smoke ledger explicitly composes the initial
full inventory with failed-case retries; it retains the source of each result. Native CLI limitations may leave a failure
unclassified; investigate rather than guess.

Prefer deterministic saved-artifact checks for exact fields, bytes, state and
supported helper receipts. `file_unchanged` compares a literal file with the
fixture's saved baseline and is headless-only. Use semantic judges for business
meaning, with short criteria and the actual evidence needed to judge them.
`graderEvidenceFiles` can provide supplemental saved artifacts; use trace focus
when a conclusion depends on successful command output. Avoid assertions about
historical fixture content, prose wording or tool-call formatting.

## Runner and hook behavior

Each case runs once, with automatic grading. Headless cases retain a normalized
transcript and generated artifacts; other cases use the native plugin-eval
harness. Semantic judges are tool-free, use best two of three votes and count
against the case cap. Each vote retries a process or malformed structured-response failure once within the remaining budget; valid FAIL votes are retained. Recovered retries are recorded in the grading detail. `--model=ID` and `--judge-model=ID` remain available. An
invalid/unavailable judge is a failure, not an unreviewed pass. See grader tests
for supported file, regex, decision-log, strategy-pointer and unchanged-file
contracts. Read-only evidence paths cannot escape the disposable fixture.

Headless reports also save `context-metrics.json` when request usage can be
parsed. Parent peak input includes cached input and excludes identified child
streams; across-request input is cumulative processing, not occupied context.
Execution totals can include delegates. Missing or incomplete observations remain
unknown; a null `contextMetricsReport` never means zero usage. These observations
have no effect on behavioral grading. Compare fixed source snapshots and models,
retain failed verdicts, and report single-sample limitations alongside savings.

Reports are local under ignored `evals/results/`, including commit, CLI version,
case results and reported usage. Do not publish private transcripts. The
optional `.githooks/pre-push` only prints a reminder. It never invokes Node,
Claude, or paid evaluations, including when the legacy `MIW_SMOKE_CASES` variable
is set. Install with `bash scripts/install-pre-push-hook.sh`.


`implement-payment-feedback-e2e` is an extended, headless full-workflow case for
the payment-date session-line request. It uses a disposable dependency-free app
with Dashboard hover details and a Sessions table. Either documented Autopilot
scope choice is acceptable. It exercises the real implementation and automatic
feedback stages; it does not replay prewritten implementation reports. The
`feedback_readback` grader requires successful tool results containing the full
saved report after its latest file modification (or the last combined-save
acknowledgement in timestamp-free fixtures) and before final presentation.
It supports Read (including cumulative numbered ranges) and
literal full-file cat commands; unrecognized read mechanisms fail closed and
need trace inspection. File modification time establishes ordering even when a
save's output is truncated. If neither that time nor an acknowledgement is
available, an existing read yields a grader error, not a workflow defect.
An artifact's existence or a model's claim cannot pass.
The semantic grader also receives saved artifacts and distinguishes registered
Unit tests from browser/DOM verification. To establish a baseline, run this one
case twice from the same frozen snapshot before changing skill instructions:

```sh
node evals/run-suite.mjs full --case=implement-payment-feedback-e2e --max-cost-usd=4 --judge-model=sonnet
```

Repeat the invocation for the second independent run. A local-check failure
skips paid judges; preserve that original failure and inspect saved evidence
separately rather than treating an unrun semantic judge as a pass. This case is
a workflow regression fixture, not a certification of the authenticated app.
Its server uses an available port and reports its URL; keep temporary artifacts
inside the fixture and stop only server PIDs started by that run.

Script-backed skills receive declared Read/Bash capabilities from `suites.json`.
`workingDirectories` selects a safe directory inside a headless fixture; native
prompt frontmatter must not contain runner-only settings. New fixtures must
carry a plugin-checkout guard. See the conventions below.

## Case naming must be prefixed per skill

`claude plugin eval --case <name>` matches case names across this plugin's **entire** `evals/` tree, not scoped to one skill's subdirectory — two skills' suites with a same-named case (e.g. `negative-control`) collide and can't be distinguished by `--case` or by the generated report.

**Convention:** prefix every case name with its skill name, e.g. `run-regression`'s cases are `rr-negative-control`, `rr-full-pass`, etc.; `close-the-gaps`'s are `close-the-gaps-negative-control`, etc. `evals/go-deep/` predates this convention and keeps its original unprefixed case names (`negative-control`, `fresh-onboarding`, `repair-path`) — don't reuse those exact names in a new skill's suite.

## Fixture scripts must never touch the real repo

Any `fixture.sh` that runs `git init`/`add`/`commit`/`checkout` must guard against being run with its cwd left at this plugin's own repo root — a real incident happened this way once during this plugin's own development, committing several concurrent sessions' in-progress work into the real repo and switching its checked-out branch. Every `fixture.sh` in this tree now refuses to run (exits 1 with a clear message) if its cwd's git toplevel resolves to this plugin's repo root; always `cd` into a disposable `mktemp -d` directory before invoking one. See any case's `fixture.sh` for the exact guard pattern.

## Known `claude plugin eval` tooling quirks

- **`file_exists` grader unreliability**: this grader type has been observed reproducibly reporting a confirmed-present file as missing. Prefer a `regex` or `llm` grader targeting that file's content (`{source: file, path: ...}`) over `file_exists` for a positive existence check.
- **Default judge model (`haiku`) unreliability on long `llm` graders**: `haiku` has been observed failing objectively-correct output on long, multi-criteria `llm` graders, especially with `focus: trace` (noisy raw JSONL). Prefer `focus: last_message` with short, single-question grader prompts, or pass `--judge-model sonnet`, for any grader judging substantial or complex content.
- **Manual headless runs of a `disable-model-invocation` skill can stochastically fail to resolve on the first attempt**: a manual `claude -p "/make-it-work:<skill> ..." --dangerously-skip-permissions` invocation of any skill with `disable-model-invocation: true` in its frontmatter (`go-deep`, `close-the-gaps`, `define-test-strategy`, `execute`, `review-the-code`, `shape-the-epic`, `slice-the-epic`) can occasionally claim the skill "isn't in the available skills list" and either stop or silently substitute an unrelated skill, with no apparent deterministic trigger — confirmed to affect multiple skills and to disappear on a plain retry of the identical command. If a manual run reports the target skill as unavailable, just retry it once before treating it as a real defect.

Headless graders may receive additional saved artifacts through
`suites.json` → `graderEvidenceFiles[caseName][graderFilename]`. Entries are
literal relative file paths inside that case's disposable fixture. The runner
adds their contents to the grader's existing evidence and marks missing files
NOT PRESENT, preserving trace-based checks for honestly blocked writes.
Traversal, glob paths and symlink escapes fail before the judge is invoked.
These runner-only settings stay out of native CLI frontmatter.
