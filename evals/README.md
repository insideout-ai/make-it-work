# Running this plugin's eval suites

## Maintainer runs for pull requests and releases

Use an existing, signed-in Claude Code installation. No API key or CI secret is
needed. A maintainer starts these commands locally, or installs the versioned
local pre-push hook to run smoke before each push. CI runs only
`node evals/validate.mjs` and other credential-free checks.
The runner checks `claude auth status` before starting; if this shell is not
signed in, use `claude auth login` interactively and retry. It never requests
or stores an API key.

```sh
node evals/run-suite.mjs smoke --dry-run  # inspect the 12 selected cases
node evals/run-suite.mjs smoke            # before every PR
node evals/run-suite.mjs full             # on demand and before a release
node evals/run-suite.mjs smoke --case=shape-the-epic-rich-input-autopilot  # retry one case
bash scripts/install-pre-push-hook.sh  # once per maintainer clone; smoke before every push
```

`smoke` exercises one representative case for each of the 12 public skills.
The `implement` case covers completion feedback rather than the complete
orchestrator; the latter is checked in the manual end-to-end release rehearsal.
`full` discovers and runs every `case.yaml` in this tree (45 at the time this
section was written). The shared inventory in `evals/suites.json` names the
smoke cases and the cases that need a direct headless run. Adding a new case
automatically adds it to `full`; adding a skill requires naming its smoke case.

The commands run each case once. Smoke runs up to four isolated cases in
parallel, in budget-limited waves; full regression remains sequential. The
cumulative reported-usage limit is $12 for smoke and $45 for full. Override it with
`--max-cost-usd=N`. Each run records the commit, Claude Code version, case
results, and cost under ignored `evals/results/<tier>-<timestamp>/`.
`--dry-run` does not invoke Claude. Plain `claude plugin eval` cases are graded
by its harness. Cases marked `headless` use a disposable fixture and produce a
`transcript.jsonl`; the runner grades their `graders/*.md` automatically.
File, regex, and tool-use checks run locally. Semantic (`llm`) checks use a
separate, tool-free Claude judge and count toward the same case and suite cost
limits. That judge receives the relevant generated fixture file, final message,
or normalized case transcript as evidence; do not run it with data that must
stay local. Each headless case writes `grader-results.json` and returns `passed`
only when every grader passes; an unavailable or invalid judge result is a
failure, never an unreviewed success. Model responses and semantic verdicts
can still vary between runs; automatic grading is not deterministic model
behavior.
The runner never uses `--dangerously-skip-permissions`. A permission refusal is
an incomplete case, not a pass; the case README documents its manual fallback.
The optional Git hook invokes `smoke` once for every push command against a
disposable snapshot of the committed HEAD, so unrelated worktree edits cannot
affect the result. Reports stay under this checkout's ignored `evals/results/`.
It reports failures but allows the push and does not enforce a PR rule. It does
not run for other contributors until they install it. Each push incurs a new
model run and usage. Automatic semantic grading adds judge calls and cost;
parallel smoke should reduce wall time but not the number of model cases.
Concurrent Claude sessions may encounter account rate limits, so inspect
failed cases.
The `shape-the-epic` smoke case uses the disposable headless path because its
file write was denied in a real plain-eval smoke run despite `Write` being
listed in `allowed_tools`.

For a PR, include the smoke report path and note any failed cases in the PR
description. For a release, run `full` for the exact release
commit and complete `docs/eval-release-checklist.md`. A failing LLM grader is
an investigation trigger: read the transcript or generated file and record
whether the skill failed or the grader misread valid output. Do not silently
turn a failing score into a pass.

Two recent complete 11-case sequential smoke runs reported $2.67 in 9m14s
and $2.79 in 10m37s. Four-way concurrency is intended to shorten wall time
without changing case count or materially changing usage, but it has not yet
been measured against a real Claude run. Budget roughly $15–25 and 1–3 hours
for the current full suite. New cases and reruns add to both. These are
reported usage estimates, not a guaranteed invoice.

Each skill with an eval suite has its own `evals/<skill-name>/` directory and its own `README.md` documenting exactly how to run that skill's cases (plain `claude plugin eval` vs. a manual `--dangerously-skip-permissions` run). This file documents conventions and known `claude plugin eval` quirks that apply across all of them.

## Case naming must be prefixed per skill

`claude plugin eval --case <name>` matches case names across this plugin's **entire** `evals/` tree, not scoped to one skill's subdirectory — two skills' suites with a same-named case (e.g. `negative-control`) collide and can't be distinguished by `--case` or by the generated report.

**Convention:** prefix every case name with its skill name, e.g. `run-regression`'s cases are `rr-negative-control`, `rr-full-pass`, etc.; `close-the-gaps`'s are `close-the-gaps-negative-control`, etc. `evals/go-deep/` predates this convention and keeps its original unprefixed case names (`negative-control`, `fresh-onboarding`, `repair-path`) — don't reuse those exact names in a new skill's suite.

## Fixture scripts must never touch the real repo

Any `fixture.sh` that runs `git init`/`add`/`commit`/`checkout` must guard against being run with its cwd left at this plugin's own repo root — a real incident happened this way once during this plugin's own development, committing several concurrent sessions' in-progress work into the real repo and switching its checked-out branch. Every `fixture.sh` in this tree now refuses to run (exits 1 with a clear message) if its cwd's git toplevel resolves to this plugin's repo root; always `cd` into a disposable `mktemp -d` directory before invoking one. See any case's `fixture.sh` for the exact guard pattern.

## Known `claude plugin eval` tooling quirks

- **`file_exists` grader unreliability**: this grader type has been observed reproducibly reporting a confirmed-present file as missing. Prefer a `regex` or `llm` grader targeting that file's content (`{source: file, path: ...}`) over `file_exists` for a positive existence check.
- **Default judge model (`haiku`) unreliability on long `llm` graders**: `haiku` has been observed failing objectively-correct output on long, multi-criteria `llm` graders, especially with `focus: trace` (noisy raw JSONL). Prefer `focus: last_message` with short, single-question grader prompts, or pass `--judge-model sonnet`, for any grader judging substantial or complex content.
- **Manual headless runs of a `disable-model-invocation` skill can stochastically fail to resolve on the first attempt**: a manual `claude -p "/make-it-work:<skill> ..." --dangerously-skip-permissions` invocation of any skill with `disable-model-invocation: true` in its frontmatter (`go-deep`, `close-the-gaps`, `define-test-strategy`, `execute`, `review-the-pr`, `shape-the-epic`, `slice-the-epic`) can occasionally claim the skill "isn't in the available skills list" and either stop or silently substitute an unrelated skill, with no apparent deterministic trigger — confirmed to affect multiple skills and to disappear on a plain retry of the identical command. If a manual run reports the target skill as unavailable, just retry it once before treating it as a real defect.
