# Running this plugin's eval suites

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
