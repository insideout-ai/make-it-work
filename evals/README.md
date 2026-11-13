# Running this plugin's eval suites

## Maintainer runs for pull requests and releases

Use an installed, signed-in Claude Code. CI runs deterministic checks only; no
API key, CI credential, recurring job or live-model schedule is created here.

| Run | Purpose | Default execution / reported-usage cap |
| --- | --- | --- |
| `smoke` | One representative case per public skill; every PR | All selected cases concurrently / $12 |
| `critical` | Explicit cross-stage and failure/resume contracts; releases and relevant changes | Up to 3 concurrently / $20 |
| `extended` | Remaining behavioral scenarios; focused work and periodic batches | Sequential / $12 |
| `full` | Every discovered case, including maintenance cases; optional exhaustive investigation | Sequential / $45 |

Every PR needs deterministic checks and a complete passing smoke run before
ready-for-review or merge. Also run focused cases for changed behavior and
known dependent skills. A shared controller or handoff change needs affected
producer/consumer cases; path filtering does not establish dependency coverage.
For releases, require smoke, critical and change-specific focused evidence on
the exact release source commit, plus [the release checklist](../docs/eval-release-checklist.md).
The archive-wide `full` run is no longer a blanket prerequisite. A confirmed
behavior defect relevant to the release remains a blocker regardless of tier;
a smaller suite cannot waive it. Document maintenance issues and their impact.

```sh
node evals/validate.mjs
node evals/catalog.mjs                   # every case, tier, disposition and check count
node evals/catalog.mjs --json            # includes each actual grader requirement
node evals/run-suite.mjs smoke --dry-run
node evals/run-suite.mjs smoke
node evals/run-suite.mjs critical
node evals/run-suite.mjs full --skill=execute --dry-run
node evals/run-suite.mjs full --case=execute-resume-inline
node evals/run-suite.mjs extended --shard=1/4 --max-cost-usd=12
```

Repeat `--case` or `--skill` for several selections; filters intersect, not union.
Select dependent skills explicitly. Empty/unknown selections fail before login
or model calls. Stable `I/N` shards partition the filtered list in catalog order;
run all shards against the same commit and selection to cover that inventory.
Do not equate one shard with a full tier pass. No automatic schedule is installed;
maintainers can rotate these batches during normal maintenance.

Non-smoke runs accept `--concurrency=1` through `4`; smoke accepts up to `14`.
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
outside the blocking critical tier until their contract, evidence and baseline
are reviewed. Adding a case does not silently add a release gate.

The [audit record](AUDIT.md) distinguishes retention from reliability. Maintenance
entries carry a disposition, reason, owner and follow-up. A case marked repair,
investigate, consolidate or retire cannot be silently promoted into smoke or
critical. A known issue already retained in a required tier must be explicitly
marked `blocking: true`; it still runs and its failure blocks certification. Repair means fix and rerun, not accept a failing verdict. No case has
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
case list, filters, source commit and completion state; a passing subset never
certifies the parent suite. Native CLI limitations may leave a failure
unclassified; investigate rather than guess.

Prefer deterministic saved-artifact checks for exact fields, bytes, state and
supported helper receipts. `file_unchanged` compares a literal file with the
fixture's saved baseline and is headless-only. `planning_receipt` is also headless-only: a case that specifically requires initial guarded test authoring checks a run-bound scoped receipt and actual authorizer success, rather than accepting an arbitrary file. It is not a universal receipt requirement for manual, legacy or reused-test scenarios. Use semantic judges for business
meaning, with short criteria and the actual evidence needed to judge them.
`graderEvidenceFiles` can provide supplemental saved artifacts; use trace focus
when a conclusion depends on successful command output. Avoid assertions about
historical fixture content, prose wording or tool-call formatting.

## Runner and hook behavior

Each case runs once, with automatic grading. Headless cases retain a normalized
transcript and generated artifacts; other cases use the native plugin-eval
harness. Semantic judges are tool-free, use best two of three votes and count
against the case cap. `--model=ID` and `--judge-model=ID` remain available. An
invalid/unavailable judge is a failure, not an unreviewed pass. See grader tests
for supported file, regex, decision-log, strategy-pointer and unchanged-file
contracts. Read-only evidence paths cannot escape the disposable fixture.

Reports are local under ignored `evals/results/`, including commit, CLI version,
case results and reported usage. Do not publish private transcripts. The
optional `.githooks/pre-push` runs smoke against an isolated committed snapshot;
`MIW_SMOKE_CASES` can select diagnostic cases but cannot satisfy the complete
smoke requirement. Install with `bash scripts/install-pre-push-hook.sh`.
The hook reports failures and allows the push; it does not certify merge or
release readiness. Each push incurs model usage. No permission bypass is used.

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

For a focused change, select relevant pre-push smoke cases explicitly, for example:

```sh
MIW_SMOKE_CASES=drive-the-epic-autopilot git push
```

Use comma-separated case names for multiple smoke cases. The hook still tests a committed snapshot and records its report; an unset selection runs the full suite. Document the selected scope in the PR.

Headless graders may receive additional saved artifacts through
`suites.json` → `graderEvidenceFiles[caseName][graderFilename]`. Entries are
literal relative file paths inside that case's disposable fixture. The runner
adds their contents to the grader's existing evidence and marks missing files
NOT PRESENT, preserving trace-based checks for honestly blocked writes.
Traversal, glob paths and symlink escapes fail before the judge is invoked.
These runner-only settings stay out of native CLI frontmatter.
