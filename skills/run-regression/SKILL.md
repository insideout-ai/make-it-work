---
description: "Runs a project's regression suite — full or scoped to specific domains/use-cases — and reports pass/fail results; the shared implementation the future `execute` skill calls at the end of a plan. Use when running or checking a project's test suite, full or scoped to specific domains/use-cases."
---

# Run Regression

## Usage

```
/make-it-work:run-regression [full | domain-<name> | UC-<id> ...]
```

- **No argument** — asks the user whether to run the full suite or a specific scope.
- **`full` or `full-suite`** — runs the full suite, no prompt.
- **One or more space-separated domain/UC tokens** (e.g. `domain-velocity UC-08`) — runs a scoped subset covering just those domains/use-cases, no prompt.

This skill is meant to be invoked both directly by a user and, once built, by the `execute` skill's own instructions passing an already-resolved argument.

## Phase 0 — Resolve repo context and mode

### Repo/workspace detection

Reuse `plan-the-work`'s Step 1a logic verbatim to decide whether this is a **single repo** or a **coordinated multi-repo workspace**. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.

1. **`.git` exists here.** This repo is a project root. Then:
   - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`).
   - Otherwise → **single-repo project**, root is here — even if the parent happens to contain other, unrelated repos.
2. **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here. If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to run against, rather than guessing.
3. **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop.

Full-suite mode (Phase 1) iterates every repo in a detected workspace. Scoped mode (Phase 2 onward) operates against exactly one repo. If a workspace is detected and no single repo is unambiguous from context (e.g. the invocation directory), list the affected repos and ask the user which one this scoped run targets via a single `AskUserQuestion` call (`multiSelect: false`), before proceeding to Phase 2 for that repo only.

### Mode resolution

Resolve the mode from the invocation argument (per the Usage syntax above):

- **No argument** → ask the user, via a single `AskUserQuestion` call (`multiSelect: false`), whether to run the full suite or a specific scope:
  - `{ label: "Full suite", description: "Run every test." }`
  - `{ label: "Scoped to specific domain(s)/use-case(s)", description: "Focus on the flows you're actively touching." }`

  If **"Full suite"** is chosen, proceed to Phase 1. If **"Scoped"** is chosen, first check whether `.claude/rules/testing-strategy.md` exists in this repo — the same availability gate Phase 2 defines. If it does not exist, skip straight to Phase 2's availability-gate message and stop; do not present a domain/UC picker for a project where scoped mode can't run anyway. Only once that file's presence is confirmed, and the user gave no tokens, read the target repo's `.claude/rules/product.md` UC table and `.claude/rules/architecture.md` Functional Domains table, and present the combined list:
  - as multi-select options (`AskUserQuestion`, `multiSelect: true`) if there are 4 or fewer combined rows;
  - otherwise as a plain-text list to choose from/confirm.

  This mirrors a confirmation-checkpoint pattern used elsewhere in this plugin's skills: show the candidate list, get explicit confirmation before proceeding, never invent flows from scratch.

- **`full` or `full-suite`** (case-insensitive) → proceed straight to Phase 1, no prompt.
- **One or more tokens matching `domain-{name}` or `UC-{id}`** → proceed straight to Phase 2 with those tokens as the requested scope, no prompt.
- **Any other argument** → tell the user the argument wasn't recognized as `full` or a `domain-*`/`UC-*` token, and fall through to the no-argument prompt above rather than guessing.

**Note:** this skill never attempts to infer who invoked it (a user typing a command vs. another skill's instructions calling it) — it only ever reacts to the argument it was given. This is a deliberate design decision: the future `execute` skill is responsible for always passing an already-resolved argument (a computed scope, or literally `full`) rather than this skill trying to detect "is my caller the completion gate."

## Phase 1 — Discover and run the full suite

Run this phase once per repo in scope: every repo in a detected workspace, or the one repo in a single-repo project (per Phase 0's repo/workspace detection).

### Discovery order

1. **Check for a test-strategy file.** Look for `.claude/rules/testing-strategy.md` in this repo. If it exists, read its `## Commands` section — this is the primary, authoritative source: `define-test-strategy` generates this file and its own spec states explicitly that this `## Commands` section is "the section a future `run-regression` skill reads to find 'the full suite command.'" That section records both the full-suite command and one example command per test layer — use only the documented full-suite command, never a per-layer example command. If the section exists but has no full-suite entry, fall through to step 2 below exactly as if the file/section were absent.
2. **Fall back to the same discovery order `plan-the-work` uses** if that file or section is absent, or has no full-suite entry, for this repo: check `package.json` scripts, `Makefile` targets, and CI config (e.g. `.github/workflows/`) for a full-test/regression command. The only exclusions are build, lint, and type-check commands — a plain `test` script or target (even one that only runs unit tests, e.g. a bare `jest`/`vitest` invocation) is a usable full-suite command on its own. If several test-related commands exist, prefer the broadest one (`test:all`, `test:ci`, or a CI job step that runs the whole suite) over a narrower `test`.

### Stop-and-ask fallback

If neither source yields a usable command for this repo, stop before running anything for this repo and tell the user, verbatim:

> Could not find a full-suite test command for `<repo>`. Specify one directly, or run `/make-it-work:define-test-strategy` first.

This condition must never report a false pass or silently skip this repo — a repo with no discoverable command is a hard stop for that repo, not an assumed pass and not a silently omitted one. If the user replies with a command, use it as this repo's full-suite command and proceed to Running the command below.

### Running the command

Once a command is found for this repo (from either source above, or supplied by the user after a stop-and-ask), run it via Bash, capturing its full output. Full suites can run long — use a generous Bash timeout (up to the maximum available) or run the command in the background and wait for completion, rather than letting a long suite get cut off mid-run. Do not parse or summarize that output here — the raw captured output is handed to Phase 4, which parses pass/fail/skip counts from it.

## Phase 2 — Resolve and validate scope

This phase runs for the single target repo scoped mode operates against (per Phase 0's repo/workspace detection) — never for a workspace as a whole. It applies no matter how the requested tokens arrived: passed directly as the invocation argument, or picked by the user from the list Phase 0's no-argument "Scoped" path presented.

### Availability gate

Before touching any token, check whether `.claude/rules/testing-strategy.md` exists in this repo. This check runs first, ahead of any token handling below.

If it does not exist, scoped mode is unavailable — regardless of who invoked this skill (this skill never branches on "am I being called by execute vs. a direct user"; see Phase 0's note on this). Tell the user exactly:

> Scoped mode isn't available in this project yet — no `.claude/rules/testing-strategy.md` found. Run `/make-it-work:define-test-strategy` first, or invoke this skill with `full` instead.

...and stop. Do not fall back to running the full suite instead, and do not print a Phase 5 report block — this is a hard stop, not a degraded result.

### Validate scope tokens

If the file exists, validate every requested domain/UC token against this repo's actual inventory before running anything.

**Inventory source:** read `.claude/skills/` directory names (`uc-*`/`domain-*`). If that directory pattern isn't present in this repo, fall back to reading `.claude/rules/product.md`'s UC table and `.claude/rules/architecture.md`'s Functional Domains table instead.

**Matching rules** (apply whichever inventory source was used):
- **UC token vs. directory:** match `UC-{id}` case-insensitively as a prefix against `uc-{id}-` — keep the trailing hyphen in the comparison, so `UC-1` does not incorrectly match a directory named `uc-10-...`.
- **Domain token vs. directory:** `domain-{name}` must match the directory name exactly.
- **UC token vs. table fallback:** compare the `{id}` part of the token against the `ID` column of `product.md`'s UC table.
- **Domain token vs. table fallback:** `architecture.md`'s Functional Domains table's `Domain` column holds short names (e.g. `velocity`), not the `domain-` prefixed form — strip the `domain-` prefix from the token before comparing.

For each requested token:
- If no matching directory or table row exists at all under these rules → mark it **"unrecognized"**.
- If a match exists → it is **recognized**; carry it forward using its canonical tag form (`UC-{id}` zero-padded as the inventory has it, e.g. `UC-08`; `domain-{name}`, e.g. `domain-velocity`) — not the raw directory name — since Phase 3 greps for this literal tag string.

**Note on "no tests mapped":** whether a recognized token actually has a test tagged with it can only be determined by Phase 3's tag search — that check does not happen in this phase. This phase's own output is therefore only two-valued per token: "unrecognized" (decided here) or "recognized, carried forward" (pending Phase 3's search). Phase 3 is responsible for moving any recognized-but-zero-match token into the unmapped list with reason "no tests mapped" once its search completes.

If, after this validation, no token is recognized at all (every requested token is "unrecognized"), skip Phase 3 and Phase 4 entirely for this run and go straight to Phase 5 with the full unmapped list — there is nothing left to search for or run.

### Outputs of this phase

This phase produces two things for the phases after it:
- **(a) The recognized-token list** (canonical tag form), handed to Phase 3 for tag-based test selection. Phase 3 will further narrow this list to only tokens that actually matched a tagged test.
- **(b) The unmapped list**, handed to Phase 5's final report, with a reason per token. This phase contributes entries reasoned **"unrecognized"**; Phase 3 later appends entries reasoned **"no tests mapped"** to the same list.

## Phase 3 — Select and filter tests for the requested scope

This phase runs only when Phase 2 handed forward at least one recognized token (output (a) above). If Phase 2 recognized zero tokens — every requested token came back "unrecognized" — Phase 2 already routed straight to Phase 5 with the full unmapped list; this phase is skipped entirely for that run, and no filter command is ever constructed for an empty token list.

### Confirm the tag convention for this repo

Before searching for anything, read this repo's `.claude/rules/testing-strategy.md` `## UC/Domain Tag Convention` section fresh, every run — never hardcode the tag form. This section is what `define-test-strategy` generates to document exactly how tags are embedded, per framework, for this project. Use whatever it documents to build the search patterns and filter command below, rather than assuming a fixed default.

For reference — and as the fallback if this section is missing or unparseable even though `.claude/rules/testing-strategy.md` itself exists — `define-test-strategy`'s own default convention is:
- The tag is embedded directly in a test suite's own description string (a `describe`/module-level test-group name) — never in a separate external file or manifest.
- **JS/TS (Jest, Vitest, Mocha, etc.):** `describe('UC-08: Withdraw Money', () => { /* ... */ });` — the literal hyphenated tag (`UC-08`, `domain-velocity`) appears directly in the description string.
- **Python (pytest):** the tag is carried in BOTH a module docstring or test class docstring (hyphenated form, e.g. `"""UC-08: Withdraw Money"""`) AND the class name itself, with the hyphen stripped (e.g. `class TestUC08WithdrawMoney:`) — the class name deliberately also carries the tag specifically so pytest's `-k` substring filter can match it, since `-k` matches test node ids/class names, not docstrings.

If this repo's actual `## UC/Domain Tag Convention` section documents something different from the default above, follow what it documents instead.

### Detect the test framework

Detect this first, since the search technique below branches on it. Use the same signal list `define-test-strategy`'s own no-framework guardrail already checks: test config files (`jest.config.*`, `vitest.config.*`, `pytest.ini`, a `[tool.pytest...]` table in `pyproject.toml`, `.rspec`), test scripts in `package.json`, a `Makefile` test target, or a test step in CI config.

### Search test files for each recognized token

For each token in Phase 2's recognized-token list (canonical tag form, e.g. `UC-08`, `domain-velocity`), grep this repo's test files for that literal tag string appearing in a test-suite description string — reusing the same search technique `define-test-strategy`'s own coverage-check phase already uses. **The search predicate must match what the filter flag below can actually select** — a token only counts as a hit if the match would also cause the filter flag to select a test, never on a form the filter can't see:
- **JS/TS frameworks:** search for the tag string inside `describe(...)` (or the framework's equivalent test-group call) arguments across test files. `--testNamePattern` matches against these description strings directly, so any such match is a valid hit.
- **pytest:** search **case-insensitively** for the hyphen-stripped tag substring (e.g. `UC08`, or `domainvelocity` for `domain-velocity`) inside a `class Test...` name only. Case-insensitivity matters specifically for domain tags: a UC tag like `UC-08` is already all-uppercase and matches a class name like `TestUC08WithdrawMoney` either way, but a lowercase, multi-word domain tag like `domain-velocity` is naturally embedded in a PascalCase class name as `TestDomainVelocity` — a case-sensitive search for the literal lowercase substring `domainvelocity` would miss this real, legitimately-tagged test and wrongly move the token to "no tests mapped." Matching case-insensitively here also keeps this search step consistent with the constructed `-k` filter below, which matches case-insensitively at runtime regardless of what this search step does. Do **not** count a docstring-only match (module or class docstring containing the hyphenated tag with no corresponding hyphen-stripped class name) as a hit — `-k` filters on node ids/class names, not docstrings, so a docstring-only match would land in the "matched" set below but the constructed `-k` filter would then select zero tests for it. Treat a docstring-only match the same as no match at all for this token.
- **Any other detected framework:** apply the equivalent of this search technique to its own way of naming test-suite groups, always keeping the search predicate aligned with that framework's own native filter-flag matching behavior.

Record, per token, whether it matched at least one test file under the rules above.

### Fold zero-match tokens into the unmapped list

Any recognized token that matched zero tests here (including a pytest docstring-only match, per the rule above) is moved into the unmapped list (Phase 2's output (b)) with reason **"no tests mapped"** — this is exactly the piece Phase 2 explicitly deferred to this phase (see Phase 2's "Note on 'no tests mapped'"). Only tokens that matched at least one test remain in the "matched" set carried forward through the rest of this phase.

If, after this search, every recognized token ends up with zero matches (the matched set is empty), do **not** construct a filter command at all: move all of them into the unmapped list as "no tests mapped", skip straight to Phase 5, and do **not** fall back to running the full-suite command Phase 1 discovered for this repo. Running the full suite here would silently broaden the run beyond the scope the user actually requested.

### Construct and run the scoped command

If at least one token matched (the matched set is non-empty), construct the scoped run command by appending that framework's native test-name filter flag, with the matched tag string(s) as its value, to the full-suite command Phase 1 already discovered for this repo:

- **Jest/Vitest (and similar JS/TS runners):** append `--testNamePattern="<tag1>|<tag2>|..."` — a regex alternation of the matched tags, as-is (hyphens included).
- **pytest:** append `-k "<tag1_no_hyphen> or <tag2_no_hyphen> or ..."` — matching the tag substring embedded in the test class name per the convention above; strip hyphens from each matched tag before inserting it into the `-k` expression, since pytest `-k` expressions can't safely contain a bare hyphen.
- **Any other/unrecognized framework:** use that framework's own documented native test-name filter mechanism, following the same pattern — append a filter flag whose value is the matched tag string(s), rather than inventing a new selection mechanism.

**Appending is only valid when the filter flag reaches the actual test runner.** Phase 1's discovered command is sometimes a wrapper — a `package.json` script invoked as `npm run <script>`, a `Makefile` target invoked as `make <target>`, or a CI job step — and a wrapper does not always forward extra arguments to the runner underneath it:
- For an `npm run <script>` (or `yarn`/`pnpm` script) command, insert `--` before the filter flag so the arguments pass through to the underlying runner instead of being consumed by the package manager: `npm run <script> -- --testNamePattern="..."`.
- For a `make <target>` command, do not append the filter flag directly to the `make` invocation — `make` interprets leading `-` arguments as its own flags, not target arguments. Instead, read the target's body in the `Makefile` to find the underlying test-runner invocation it wraps, and apply the filter flag to that underlying command directly (or invoke the detected runner directly with the same arguments the target would otherwise use).
- For a CI-config-derived command, apply the same rule: append to the runner invocation itself, not to any wrapper script around it.
- If, after this check, no way is found to reliably attach the filter flag so it reaches the actual runner, do **not** run the wrapper command unfiltered — that would silently broaden the run past the requested scope, the same failure mode this phase already guards against for a zero-match scope. Instead, stop for this run, tell the user the requested scope's tests were matched but the discovered full-suite command couldn't be filtered to just those tests, and report the affected tokens as unmapped with reason "no tests mapped" in Phase 5 rather than running anything wider.

Once a valid filtered command is constructed, run it via Bash the same way Phase 1 runs the full-suite command: capture its full output, and use a generous timeout (up to the maximum available), or run it in the background and wait for completion, rather than letting it get cut off mid-run. Do not parse or summarize the output here — hand it to Phase 4, exactly like Phase 1's captured output, for parsing pass/fail/skip counts.

**v1 limitations (accepted, not fixed here — consistent with Phase 2's own accepted v1 rough edges):** the filter flags above match by substring/regex, so `--testNamePattern="UC-08"` can also match an unrelated `UC-080`, and `domain-velocity` can also match `domain-velocity-reports`; and a repo with more than one test framework present (e.g. both Jest and pytest signals detected) isn't addressed here — this phase assumes exactly one framework is in play per repo.

## Phase 4 — Parse results

This phase runs once per repo/run against the command output captured earlier: Phase 1's full-suite run, or Phase 3's scoped/filtered run when Phase 3 constructed and ran one. If neither ran for this repo, skip this phase entirely for that repo/run — see "Nothing was ever run for this repo" below for what Phase 5 reports instead.

### Locate the runner's own summary output

Parse the captured output for the detected framework's own terminal summary — do not re-count individual test result lines yourself; the runner already aggregates them. Exact wording and column order vary by framework version, so match on labeled counts, never on a fixed column position. Read every labeled category actually present; a zero-valued category is often omitted entirely rather than printed as `0`.

- **Jest:** the counts on the `Tests:` line (`X failed, Y skipped, Z todo, W passed, N total` — categories present vary by version). **Also** check the separate `Test Suites:` line: a file that fails to load/compile (a syntax error, a broken import) is counted there as a failed suite but its individual tests never appear on the `Tests:` line at all, so `Tests: 0 failed` can co-exist with a real failure. Treat a nonzero `Test Suites: … failed` count as blocking, the same as a nonzero `Tests: … failed` count.
- **Vitest:** the same pattern under its own labels — a `Tests:` line (or equivalent) for individual test outcomes, and a `Test Files:` line for whole-file failures (e.g. a file that threw during collection). Apply the same "check both" rule as Jest.
- **pytest:** a line of the form `X passed, Y skipped, Z failed` (order and the set of categories present vary; pytest may also show `error`, `xfailed`, `xpassed`, `deselected`, etc., omitting any zero-valued category).
  - Treat `error` the same as `failed` — an error means the test didn't run to a clean pass or fail either, so it's just as blocking.
  - Treat `skipped` and `xfailed` as excluded/non-blocking.
  - `xpassed` (an expected-fail test that unexpectedly passed) is non-blocking; count it with passed for reporting purposes.
  - `deselected` (tests `-k` filtered out entirely) counts as neither run, passed, failed, nor skipped — exclude it from every count below.
- **Mocha (and similar):** the equivalent `passing`/`failing`/`pending` counts — `pending` is Mocha's skip/placeholder label, treated the same as Jest's `skipped`/`todo` or pytest's `skipped`.
- **Any other/unrecognized framework:** locate the same underlying concepts — tests actually executed, passed, failed (or errored), and explicitly skipped/pending/deselected — under whatever labels that framework's own summary output uses, and apply the same counting rules below. Do not invent a fixed format; read whatever the tool actually printed, and check for a separate whole-file/suite-level failure indicator the way Jest/Vitest require, if this framework has one.

### Stub/placeholder exclusion

A "skipped"/"pending"/"todo" count (and, for pytest, `xfailed`) is always excluded from the blocking-failure determination. This is exactly how `define-test-strategy`'s scaffolded stub/placeholder tests are represented — via each framework's own native skip/pending marker (e.g. `it.todo`, `test.skip`, `@pytest.mark.skip`) — so the runner's own skip/pending accounting already **is** the stub-detection mechanism. No separate stub-detection heuristic is needed or should be built here.

### Define "executed" and "runner-recognized total" (needed for the zero-tests-executed guard below)

**Executed** = passed + failed + error (folded into failed) — i.e. tests the runner actually ran to a pass/fail/error outcome. Skipped, todo, pending, xfailed, xpassed, and deselected are all excluded from "executed": a filtered run where every non-matching test is reported as "skipped" (Jest's `--testNamePattern`/`-t`, e.g. `Tests: 42 skipped, 42 total`) must not be mistaken for a run that executed 42 tests — none of those 42 were actually run against the filter's intent, they were simply not selected. Likewise pytest's `-k` reports the non-matching tests as `deselected`, not as part of any executed count.

**Runner-recognized total** = executed + skipped + todo + pending + xfailed + xpassed — every category the runner reports as belonging to this filtered run, **excluding only `deselected`** (tests the filter explicitly excluded, never touched at all). This is a distinct, broader count from "executed," used only by the zero-tests-executed guard below — it exists specifically to tell apart "the filter matched nothing at the runner level at all" (a real anomaly) from "the filter correctly matched only stub/placeholder tests, which the runner then legitimately reported as skipped" (not an anomaly — see the guard below).

### Gate result

**FAIL** if any of the following holds; otherwise **PASS**:
- the parsed failed count (including any `error`/whole-suite-failure category folded in per above) is greater than zero; or
- the zero-tests-executed guard below fires for this run; or
- no recognizable summary output could be located in the captured command output at all (e.g. the command crashed, a config error prevented tests from starting, output was truncated by a timeout, or the runner printed something like Jest's "No tests found" / pytest's "no tests ran" with no parseable counts) — report this as its own condition, reason **"could not parse test results"**, rather than defaulting to PASS. A nonzero process exit code paired with zero parsed failures is a signal to double-check for this case rather than accept it as a clean pass.

A nonzero skipped/todo/pending count alone never fails the gate — those are excluded from this determination entirely, per the exclusion rule above. (Reconciling with the zero-tests-executed guard: a gate that reported PASS purely because failed=0, while nothing was actually executed, would be silently folding "nothing ran" into a passing result — exactly what the guard exists to prevent. So the guard is a second, independent FAIL trigger alongside a nonzero failed count, not merely an annotation on top of an otherwise-PASS result.)

### Zero-tests-executed guard

If Phase 3 constructed and ran a scoped/filtered command for this repo (i.e. at least one token matched at least one test file), but the **runner-recognized total** defined above comes back zero — not merely "executed" — this is its own reported condition: **"scope matched N test file(s) but the runner reported 0 tests executed."** This also fails the gate (see above) — never silently fold a zero-recognized run into a passing result. Hand this condition to Phase 5 alongside whatever counts were parsed (in this case, everything is zero, including skipped/todo).

Deliberately, this guard does **not** fire when "executed" is zero but runner-recognized total is greater than zero (i.e. the filter matched real tests at the runner level and every one of them was reported as skipped/todo/pending/xfailed/xpassed) — that is the legitimate "this scope's only coverage is currently a stub/placeholder" case, not an anomaly. In that case, gate result is governed purely by the failed count (zero, since nothing executed to a failure) → **PASS**, with the skipped/placeholder count reported normally per the stub-exclusion rule above. This is the resolution to the tension an earlier draft of this phase flagged: distinguishing "the filter found nothing at all" (guard fires, FAIL) from "the filter found only stub tests, which correctly reported as skipped" (guard does not fire, PASS) by checking runner-recognized total rather than executed alone.

This is a different condition from Phase 3's "zero tokens matched any test at all" case (every recognized token had zero test-file matches) — that case never constructs a filter command and never reaches Phase 4 in the first place; it's handled entirely within Phase 2/Phase 3 by moving those tokens to the unmapped list. The guard here is specifically for "we ran a filter command against at least one matched test file, and the runner recognized nothing at all for it" — e.g. the filter flag didn't actually select what the file-level grep found.

### Nothing was ever run for this repo

When Phase 2 (every requested token unrecognized), Phase 3 (every recognized token matched zero tests), or Phase 3's wrapper-attachment refusal (tests were matched but no reliable way was found to attach the filter flag to the actual runner) routes straight to Phase 5 because nothing was ever executed for this repo, Phase 4 is skipped entirely for that repo/run — there is no command output to parse. In every one of these scoped-mode cases, Phase 5 reports:

- **Gate result: FAIL**
- **Reason:** "no tests executed for the requested scope"

This section covers only the scoped-mode routes above. Full-suite mode has its own, separate way of reaching this phase without anything having run: Phase 1's stop-and-ask condition (this repo's full-suite test command couldn't be discovered at all). That case skips this phase for the same reason — there is no command output to parse — but Phase 5 reports it with its own distinct reason naming that the command couldn't be discovered, not the "no tests executed for the requested scope" wording above, which is reserved for the scoped-mode routes. See Phase 5's "Filling in Gate result and Reason" for exactly how each of these is worded.

### Outputs of this phase

Per repo/run, this phase produces, for Phase 5 to assemble into the final report:

- **Passed count** (including pytest's `xpassed`, folded in)
- **Failed count** (including any `error`/whole-suite-failure category folded in)
- **Skipped count** (including todo/pending/`xfailed`, folded in)
- **Gate result** (PASS/FAIL, per the rule above)
- **Any zero-tests-executed or could-not-parse condition**, with its reported reason string, when either applies

## Phase 5 — Report results

This is the final phase: it assembles whatever the earlier phases produced for each repo in scope into one fixed chat block per repo, and prints it. **Nothing here is written to disk, and nothing is read back from disk.** The report is returned live, in the same chat turn, to whichever session invoked this skill — a direct user invocation or, once built, the `execute` skill's own completion-gate call — per the spec's Decision Log ("no persisted file — return the result live to the caller only"). There is no report file for a re-run to check for or overwrite, and no raw test-runner log is ever pasted into the chat response: only the fixed summary block below, plus (for a multi-repo full-suite run only) the one leading line described in "How many blocks: full-suite mode" below. The three stop-and-ask conditions that can precede or replace this phase entirely — Phase 0's "could not identify the project root," Phase 1's per-repo undiscoverable-command stop, and Phase 2's scoped-mode availability gate — are each handled exactly as described under "Stop-and-ask conditions and this phase" below; none of them prints raw test-runner output either.

### The fixed block

Print exactly this shape, once per repo (see "How many blocks: full-suite mode" and "How many blocks: scoped mode" below for which repos get one, and in what order relative to any stop-and-ask message):

```
Mode: <Full suite | Scoped>
Repo: <repo name>
Suite(s) run: <the command(s) actually executed, or "None" when nothing ever ran for this repo>
Passed: <n>  Failed: <n>  Skipped/placeholder (excluded): <n>
Unmapped scope (not run): <comma-separated list, or "None"> — <"unrecognized" or "no tests mapped" reason per name>
Gate result: <PASS | FAIL>  [Reason: <reason string, only when one applies — see "Filling in Gate result and Reason" below>]
```

Every field is always present; a field with nothing to report still prints its label with `None` or `0`, rather than being omitted — this keeps every block the same shape whether the run was a clean pass, a real failure, or a stop-and-ask condition. `Repo:` always names exactly one repo — a workspace is never named on this line; see "How many blocks: full-suite mode" for the separate workspace-level line a multi-repo run prints.

### Filling in each field

- **Mode** — `Full suite` or `Scoped`, per Phase 0's mode resolution. Never mixed within one block.
- **Repo** — this one block's single repo name, always. A multi-repo full-suite run never puts `workspace: <n> repos` on this line — that count is reported once, on its own leading line before the first block (see "How many blocks: full-suite mode" below), and every block underneath it still names its own one repo here.
- **Suite(s) run** — the exact command(s) actually executed for this repo/run: Phase 1's full-suite command, or Phase 3's constructed filtered command. Print `None` when nothing ever ran for this repo — this is always the case whenever the "Nothing was ever run" handoff fired, from any of the points in the flow that can produce it (Phase 1's stop-and-ask, or Phase 2/Phase 3's scoped-mode routing, per "Filling in Gate result and Reason" below).
- **Passed / Failed / Skipped** — Phase 4's parsed counts verbatim; `0`/`0`/`0` whenever Phase 4 never ran for this repo (nothing was executed to parse) **or** Phase 4 ran but its could-not-parse condition fired (output was produced but no countable summary could be located in it — see "Filling in Gate result and Reason" below).
- **Unmapped scope (not run)** — scoped mode only. Reflects Phase 2's and Phase 3's combined unmapped list for this run: every token Phase 2 marked "unrecognized," plus every token Phase 3 moved over marked "no tests mapped," listed together with each entry's own specific reason (e.g. `nonexistent-domain — unrecognized, UC-99 — no tests mapped`). Print `None` when the list is empty. **Full-suite mode always prints `None` here** — full-suite mode has no requested scope to leave unmapped; this line is a scoped-mode-only concept, never populated for a full-suite block. A nonzero unmapped list never by itself fails the gate: see "Partial scoped runs are not automatically FAIL" below.

### Filling in Gate result and Reason

`Gate result` is `PASS` or `FAIL` per Phase 4's rule (or, when Phase 4 never ran because nothing was ever executed, the FAIL outcome that condition itself dictates — see below). The bracketed `Reason:` is printed only when the phases produced one for this run — never invented, never printed as an empty placeholder — drawn verbatim from whichever of these fired, in the exact wording given here:

- **Phase 1's stop-and-ask (full-suite mode only, per repo):** when this repo's own Phase 1 could not discover a full-suite test command at all, no `Reason:` string is handed forward from Phase 4 (Phase 4 never ran for this repo either — there is no command output to parse). This repo's block reports `Gate result: FAIL` with the fixed reason `Reason: could not discover a full-suite test command for this repo` — a distinct, fixed string, not a paraphrase — reflecting Phase 1's own stop message ("Could not find a full-suite test command for `<repo>`..."). `Suite(s) run: None`, and `Passed: 0  Failed: 0  Skipped/placeholder (excluded): 0`.
- **Phase 2/Phase 3's "nothing was ever run for this repo" handoff (scoped mode only):** every requested token unrecognized (Phase 2), every recognized token matched zero tests (Phase 3), or Phase 3's wrapper-attachment refusal — per Phase 4's own "Nothing was ever run for this repo" section, all three route here with `Gate result: FAIL` and `Reason: no tests executed for the requested scope`, `Suite(s) run: None`, `Passed: 0  Failed: 0  Skipped/placeholder (excluded): 0`, and the full unmapped list populated with each entry's specific reason.
- **Phase 4's could-not-parse condition:** when no recognizable summary output could be located in the captured command output at all, print `Reason: could not parse test results` verbatim, with `Passed: 0  Failed: 0  Skipped/placeholder (excluded): 0` (no counts could be determined from unparseable output) — this is still a real run that produced output, just not output this skill could parse, so `Suite(s) run` still names the command that was executed, unlike the two "nothing was ever run" cases above where nothing ever ran.
- **Phase 4's zero-tests-executed guard (scoped mode only):** when Phase 3 constructed and ran a filtered command but the runner-recognized total came back zero, print `Reason: scope matched N test file(s) but the runner reported 0 tests executed` verbatim (with `N` filled in), never the generic "no tests executed for the requested scope" wording — these are two distinct failure conditions from two different points in the flow (one where nothing was ever run because scope resolution/filtering found nothing to run in the first place; the other where a filter command did run but the runner recognized nothing), and the reason line is what lets the reader tell them apart.
- **A plain failed-count FAIL:** when the failed count parsed by Phase 4 is greater than zero and none of the conditions above applies, `Gate result: FAIL` with no `Reason:` — the nonzero `Failed:` count in the block already says why.
- **PASS:** no `Reason:` is ever printed alongside `Gate result: PASS`.

### Partial scoped runs are not automatically FAIL

An unmapped entry does not, by itself, fail the gate. A scoped run naming one recognized-and-tested token plus one unrecognized/unmapped token, where the recognized token's matched tests all pass, reports `Gate result: PASS` with the unmapped token still listed on the `Unmapped scope (not run)` line — Phase 4's gate rule governs the matched/executed portion of the scope only; being unmapped is orthogonal to whether the tests that *did* run passed. Only the "nothing was ever run" condition (every requested token came back unrecognized or unmapped, so the matched set is empty) forces `Gate result: FAIL` — that is a property of nothing having executed at all, not of the unmapped list being nonempty.

### Stop-and-ask conditions and this phase

Three conditions can stop the run before or instead of a normal report, each handled differently by this phase:

- **Phase 0's "Could not identify the project root":** this fires before mode or repo scope is even known. Phase 0's message is shown and the run stops there — no Phase 5 block is printed for it, for any repo.
- **Phase 2's availability gate (scoped mode):** this repo has no `.claude/rules/testing-strategy.md`. Phase 2's message is shown and the run stops there — no Phase 5 block is printed, per Phase 2's own instruction.
- **Phase 1's stop-and-ask (full-suite mode, per repo):** this repo's full-suite command could not be discovered. Phase 1's verbatim message is shown for that repo. What happens next depends on how many repos are in scope:
  - **Single-repo full-suite run:** this is the only repo, so this is a hard stop for the whole invocation, the same as Phase 0's and Phase 2's stops above — the run pauses for the user to supply a command (per Phase 1) or ends there; no Phase 5 block is printed unless/until a command is supplied and the run proceeds normally to a real Suite(s) run/Passed/Failed/Skipped outcome.
  - **Multi-repo full-suite run:** per Assumption 5's per-repo independence, this one repo's stop-and-ask does not pause the rest of the workspace run. This repo's block is printed with `Gate result: FAIL` and the fixed reason from "Filling in Gate result and Reason" above, and the run proceeds to attempt every other repo in the workspace — this is exactly the case named in "How many blocks: full-suite mode" below.

### How many blocks: full-suite mode

Full-suite mode runs Phase 1 once per repo in scope: every repo in a detected workspace, or the one repo in a single-repo project (per Phase 0). Phase 5 mirrors that structure exactly:

- **Single-repo full-suite run:** print exactly one block, with no leading workspace line and no `Overall gate result` line — there is only the one repo, so its own `Gate result` line is the final word.
- **Multi-repo full-suite run (a detected workspace):** print one leading line, `Workspace: <n> repos`, naming how many repos are in scope; then print one block per repo in the workspace, in turn, each with its own `Repo:` line naming that repo — including a repo whose own Phase 1 hit a stop-and-ask condition, per "Stop-and-ask conditions and this phase" above. Per Assumption 5's per-repo independence, every repo in scope is processed on its own: one repo's command being undiscoverable, or one repo's suite failing, never causes this skill to stop early or silently omit any other repo's block — the run still attempts and reports every remaining repo. For example:

  ```
  Workspace: 3 repos

  Mode: Full suite
  Repo: billing-service
  ...
  Gate result: PASS

  Mode: Full suite
  Repo: payments-service
  ...
  Gate result: FAIL  Reason: could not discover a full-suite test command for this repo

  Mode: Full suite
  Repo: web-frontend
  ...
  Gate result: PASS

  Overall gate result: FAIL
  ```

  After every repo's block has been printed, add one final combined line, `Overall gate result: <PASS | FAIL>` — `FAIL` if any repo's own `Gate result` is `FAIL` (whether from a real test failure, a could-not-parse condition, or a repo whose command couldn't be discovered at all); `PASS` only when every repo's own `Gate result` is `PASS`. Neither the leading `Workspace:` line nor this closing `Overall gate result:` line ever appears for a single-repo run.

### How many blocks: scoped mode

Scoped mode operates against exactly one repo (per Phase 0's repo/workspace detection and this plan's single-repo scoped-mode-only decision for v1) — it is never run against a whole workspace and never produces more than one block, and never prints a leading `Workspace:` line or a closing `Overall gate result:` line. Print exactly one block:

- If Phase 2's availability gate stopped the run (no `.claude/rules/testing-strategy.md` in this repo), Phase 5 is never reached at all — per "Stop-and-ask conditions and this phase" above, this is a hard stop, not a degraded result, and no block is printed for it.
- Otherwise, print the one block for this repo. Its `Unmapped scope (not run)` line reflects Phase 2's and Phase 3's combined unmapped list as described above, and its `Gate result`/`Reason` follow "Filling in Gate result and Reason" above — including the "nothing was ever run" case when every requested token came back unrecognized or unmapped (per "Partial scoped runs are not automatically FAIL" above, a partial unmapped list alongside a passing matched/executed portion still reports `Gate result: PASS`).
