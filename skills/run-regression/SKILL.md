---
name: run-regression
description: "Runs a project's regression suite — full, per repo (`full:<repo>`), or scoped to repo-qualified use-case/domain tokens across every test location — and reports pass/fail results; the shared implementation `execute` calls at the end of a plan. Use when running or checking a project's test suite, full or scoped to specific domains/use-cases."
---

# Run Regression

## Usage

```
/make-it-work:run-regression [full | full:<repo> | <repo>:UC-<id> | <repo>:domain-<name> ...] [--autopilot]
```

- **No argument** — asks the user whether to run the full suite or a specific scope.
- **A bare `full` or `full-suite`, alone** — today's full mode: runs the full suite, no prompt.
- **Any other token set** — a **mixed** run, no prompt. It may contain several repo prefixes, e.g. `payments-api:UC-08 qa-automation:domain-velocity full:payments-api`:
  - `<repo>:UC-<id>` / `<repo>:domain-<name>` — runs the tests tagged with that token, in every test location of `<repo>`'s strategy.
  - `full:<repo>` — runs `<repo>`'s own full suite.
  - Every scope token needs a `<repo>:` prefix; an unprefixed `UC-*`/`domain-*` token is unrecognized. A bare `full` mixed with other tokens is unrecognized too.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing. `--autopilot` is parsed and stripped as a flag before the remaining tokens are classified — it may appear anywhere in the argument list (`execute` appends it, e.g. `payments-api:UC-08 full:payments-api --autopilot`) and never counts as "no argument" or as an unrecognized scope token on its own. Invoking `--autopilot` with no scope argument resolves to `full` — see Autopilot Mode.

This skill is invoked both directly by a user and by the `execute` skill's own instructions passing an already-resolved argument.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — the exact option labels, `multiSelect` settings, and list-vs-picker thresholds all still apply and get exercised on every run — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard-stop exception:** no destructive or irreversible action exists anywhere in this skill — `run-regression` runs tests and reports results; it never overwrites, discards, or replaces any existing file or state (see Phase 5: nothing is ever written to disk except the autopilot log below). There is therefore no destructive-action analog to name as a hard-stop exception, stated explicitly rather than omitted.

**Mode choice default:** the Phase 0 mode choice (Full suite vs. Scoped, the "No argument" case below) resolves automatically when `--autopilot` is invoked with no `full`/`full-suite`/`full:<repo>`/`<repo>:UC-*`/`<repo>:domain-*` argument: choose the option labeled `(Recommended)` — `Full suite` (see its label in Mode resolution below). Full suite is the broadest, non-destructive option — it runs every test, nothing is narrowed or skipped — which is why it's the safe unattended default rather than `Scoped`, which would otherwise need its own follow-up domain/UC picker with no way to ask it unattended.

**Decision log:** write `make-it-work/run-regression-autopilot-log.jsonl` under cwd — the invocation root, never under a repo a token targets — created fresh (truncated to empty) at the very start of every `--autopilot` invocation, before any site is checked, and appended to as each site below is reached. This is the only file this skill ever writes under any invocation — every other phase (notably Phase 5) writes nothing to disk at all; see Phase 5's own note. A run where zero interactive sites fire — the common case, since an explicit `full`, `full:<repo>`, `<repo>:UC-*` or `<repo>:domain-*` argument that resolves unambiguously hits none of the sites below — still leaves behind an empty log file; its bare existence is the evidence `--autopilot` engaged, even when nothing needed resolving. Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses only `"askUserQuestion"` and `"checkpoint"` (it has no non-enumerable `open_text` sites), `multiSelect` is a genuine boolean, so `chosen` is a string, an array of strings for `multiSelect: true`, or `null` — never free text. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 0"`, `"Phase 1"`. `site` examples: `"mode-choice"`, `"repo-ambiguity"`, `"no-command"`.

When Bash is permitted, initialize this log in its own Bash tool call with `node "<base>/../../scripts/decision-log.mjs" init run-regression --root "<cwd>"`, then use that writer's `append` command for each resolved site. Never combine a log call with discovery or test execution: a denied log write must not prevent those separate operations. If the log write is denied, do not retry it through another tool or path; continue the substantive run, since unrelated Bash calls may still be allowed. If Bash is unavailable, retain the existing Write/Edit behavior. Resolve `<base>` to this skill's directory; the shared writer contract is in `docs/autopilot-log-schema.md`.

**Resolution table** (one row per interactive site):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 0 | ambiguous repo pick among unrelated clones with no unifying doc | `checkpoint` | No safe default — which repo even exists isn't a product-policy choice to infer. Stop and require a human. |
| Phase 0 | mode choice, no argument (Full suite vs. Scoped) | `askUserQuestion` | Choose the option labeled `(Recommended)` — `Full suite`. |
| Phase 0 | no-argument Scoped picker — the repo pick when cwd is a workspace root, then that repo's prefixed-token candidate list (only reachable when "Scoped" is chosen with no tokens given) | `checkpoint` | Schema-exempt: these sites' interactive form varies (`askUserQuestion` for ≤4 options, a plain-text list otherwise), but they never fire under autopilot either way, so the exact `kind` doesn't matter in practice. Unreachable under autopilot: the mode-choice site above always resolves to `Full suite`, never `Scoped`, when no argument is given — so these sites are never reached unattended. If a future change to the mode-choice resolution ever makes `Scoped` autopilot's choice, treat this the same as the other no-default sites above: stop and require a human. |
| Phase 1 | stop-and-ask fallback — no discoverable full-suite command for this repo, bare `full`, single-repo run | `checkpoint` (deliberately **not** treated as an open-ended best-guess site) | Never invent a test command here — a guessed command could produce a false PASS or FAIL that has nothing to do with this project's real suite, which this skill's own "never a false pass" invariant forbids. Print Phase 1's stop message verbatim, print no Phase 5 block, and stop. A multi-repo run needs no resolution at this site at all: Phase 5 already reports that one repo's block automatically (`Gate result: FAIL`, fixed reason) and the run proceeds to the rest of the workspace regardless of `--autopilot`. A `full:<repo>` token never reaches this site either: it is recorded as `not run — no full-suite command found` (Phase 1). |

Two sites in this skill are deterministic gates, not questions, and need no autopilot resolution at all because they already behave identically with or without `--autopilot`: Phase 2's scoped-mode availability gate (no `.claude/skills/test-strategy/SKILL.md`) and Phase 3's wrapper-attachment refusal (matched tokens whose file paths can't be reliably attached to the discovered runner). Phase 0's "could not identify the project root" stop is the same — a hard stop with no human input that could resolve it, unaffected by autopilot.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision (or the single "stopped — no default/no command" decision, when that's what happened) and the decision log's path, so someone can audit the run afterward.

## Phase 0 — Resolve repo context and mode (autopilot: see Autopilot Mode)

### Repo/workspace detection

Reuse `plan-the-work`'s Step 1a logic verbatim to decide whether this is a **single repo** or a **coordinated multi-repo workspace**. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.

1. **`.git` exists here.** This repo is a project root. Then:
   - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`).
   - Otherwise → **single-repo project**, root is here — even if the parent happens to contain other, unrelated repos.
2. **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here. If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to run against, rather than guessing. (autopilot: see Autopilot Mode)
3. **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop.

A bare `full` (Phase 1) iterates every repo in a detected workspace. The step 2 ask above applies only to a bare `full` and to the no-argument path; a token run uses detection only to find the workspace root, since each prefix resolves its own repo.

**Finding a token's repo.** A token's prefix (`<repo>` in `<repo>:UC-08`, `<repo>:domain-velocity` or `full:<repo>`) names a repo. It is cwd's git toplevel when that directory's basename matches `<repo>`; otherwise a same-named subdirectory of cwd; otherwise a same-named subdirectory of the detected workspace root. If none exists, the repo is not found. Check for a directory by matching a file inside it (e.g. Glob `<repo>/*` or `<repo>/.git/HEAD`): Glob returns only files, so a pattern naming just the directory never matches.

For token runs, group tokens by prefix. For each prefix, find the repo as above (`repo not found` is a validation reason for that prefix's tokens), read its `.claude/skills/test-strategy/SKILL.md`, and use every location in its `## Test Locations`. Each prefix is one group of runs; Phase 2 onward handles its scope tokens, and Phase 1 handles its `full:<repo>` token.

### Mode resolution (autopilot: see Autopilot Mode)

Resolve the mode from the invocation argument (per the Usage syntax above). `--autopilot` is stripped before this classification runs (see Usage) and never itself counts as "no argument":

- **No argument** → ask the user, via a single `AskUserQuestion` call (`multiSelect: false`), whether to run the full suite or a specific scope:
  - `{ label: "Full suite (Recommended)", description: "Run every test." }`
  - `{ label: "Scoped to specific domain(s)/use-case(s)", description: "Focus on the flows you're actively touching." }`

  If **"Full suite"** is chosen, proceed to Phase 1 as a bare `full`. If **"Scoped"** is chosen:
  1. **Pick the repo.** If cwd is a workspace root, ask which repo to scope via a single `AskUserQuestion` call (`multiSelect: false`) listing the workspace's repos — or, with more than 4 repos, a plain-text numbered list to pick from in reply. Otherwise the repo is cwd's git toplevel.
  2. **Check availability.** Check whether that repo's `.claude/skills/test-strategy/SKILL.md` exists — the same availability gate Phase 2 defines. If it does not exist, skip straight to Phase 2's availability-gate message and stop; do not present a picker for a repo where scoped mode can't run anyway.
  3. **Offer its tokens.** Read that repo's inventory the same way Phase 2 does (`.claude/skills/` `uc-*`/`domain-*` directory names, falling back to `.claude/rules/product.md`'s UC table and `.claude/rules/architecture.md`'s Functional Domains table), and present the combined list as prefixed tokens (`<repo>:UC-<id>`, `<repo>:domain-<name>`):
     - as multi-select options (`AskUserQuestion`, `multiSelect: true`) if there are 4 or fewer combined rows;
     - otherwise print the combined list as a plain-text numbered list (`AskUserQuestion` cannot hold that many options in one call) and ask the user to confirm it as-is or edit it in reply — naming only the specific prefixed tokens they want this scoped run to cover.

  This mirrors a confirmation-checkpoint pattern used elsewhere in this plugin's skills: show the candidate list, get explicit confirmation before proceeding, never invent flows from scratch. (autopilot: see Autopilot Mode — unreachable under autopilot today, since reaching it requires the no-argument mode choice above to have already resolved to "Scoped," which autopilot never does unattended.)

- **A bare `full` or `full-suite`, alone** (case-insensitive) → proceed straight to Phase 1 for every repo in scope, no prompt.
- **A mixed token set** — every token is `full:<repo>`, `<repo>:UC-{id}` or `<repo>:domain-{name}` → no prompt. Group the tokens by prefix (see "Finding a token's repo" above). Each `full:<repo>` goes to Phase 1 for that repo only; each prefix's scope tokens go to Phase 2 as that prefix's requested scope.
- **Any other argument** (including an unprefixed `UC-*`/`domain-*` token, or a bare `full` alongside other tokens) → tell the user the argument wasn't recognized as a bare `full` or a `full:<repo>`/`<repo>:UC-*`/`<repo>:domain-*` token — scope tokens need a `<repo>:` prefix — and fall through to the no-argument prompt above rather than guessing.

**Note:** this skill never attempts to infer who invoked it (a user typing a command vs. another skill's instructions calling it) — it only ever reacts to the argument it was given. This is a deliberate design decision: the `execute` skill is responsible for always passing an already-resolved argument (a computed mixed token set, or literally `full`) rather than this skill trying to detect "is my caller the completion gate."

## Phase 1 — Discover and run the full suite

Run this phase once per repo in scope. For a bare `full`: every repo in a detected workspace, or the one repo in a single-repo project (per Phase 0's repo/workspace detection). For a mixed run: once per `full:<repo>` token, for that repo only.

### Discovery order

1. **Read the test-strategy skill.** Look for `.claude/skills/test-strategy/SKILL.md` in this repo. If it exists, it is the authoritative source: each `## Test Locations` row holds that location's `Full-suite command` and its `Run from` directory (relative to this repo's root). Which rows run depends on the mode — cross-repo rows run only through tags (Phase 3) or an explicit `full:<repo>`:
   - **Bare `full`:** only this repo's own first row (the repo itself), run from its `Run from`.
   - **`full:<repo>`:** `<repo>`'s own strategy's first row. If `<repo>` has no strategy skill, use the row whose `Repo` is `<repo>` in the invoking strategy (cwd's git toplevel's `.claude/skills/test-strategy/SKILL.md`); otherwise fall back to step 3.

   A row whose command is `none` is not run — record `not run — no tests in repo` (see Run prerequisites below); this is never a FAIL and never triggers the stop-and-ask.
2. **Old contract only.** If this repo has `.claude/rules/testing-strategy.md` but no `.claude/skills/test-strategy/SKILL.md`, do not read the old file. Tell the user: "Found `.claude/rules/testing-strategy.md` but no `.claude/skills/test-strategy/SKILL.md` — re-run `/make-it-work:define-test-strategy` to migrate." Then continue as if there were no strategy (step 3).
3. **Fall back to the same discovery order `plan-the-work` uses** only when there is no strategy skill: check `package.json` scripts, `Makefile` targets, and CI config (e.g. `.github/workflows/`) for a full-test/regression command. The only exclusions are build, lint, and type-check commands — a plain `test` script or target (even one that only runs unit tests, e.g. a bare `jest`/`vitest` invocation) is a usable full-suite command on its own. If several test-related commands exist, prefer the broadest one (`test:all`, `test:ci`, or a CI job step that runs the whole suite) over a narrower `test`.

### Stop-and-ask fallback (autopilot: see Autopilot Mode)

This applies only to a bare `full`. If no source yields a usable command for this repo, stop before running anything for this repo and tell the user, verbatim:

> Could not find a full-suite test command for `<repo>`. Specify one directly, or run `/make-it-work:define-test-strategy` first.

This condition must never report a false pass or silently skip this repo — a repo with no discoverable command is a hard stop for that repo, not an assumed pass and not a silently omitted one. If the user replies with a command, use it as this repo's full-suite command and proceed to Running the command below.

For a `full:<repo>` token, a failed discovery is not a stop: record `not run — no full-suite command found` for that repo and continue the run. It is never a FAIL.

### Run prerequisites

Before running any location — here, or a matched location in Phase 3 — when its repo has a strategy skill, read that location's `### <Location>` subsection under `## Run Prerequisites`. Do not execute the location, and record `not run — <reason>` for Phase 5, when any of these holds:

- `Local run:` is not `yes` — reason: its value (`ci-only`, `slow` or `flaky`).
- A listed env var is unset — reason: `env var <NAME> unset`.
- A listed service's check command fails — reason: `<service> unavailable`.
- The row's command is `none` — reason: `no tests in repo`.

A not-run location produces no gate result of its own and never counts as FAIL.

### Running the command

Once a command is found for this repo (from any source above, or supplied by the user after a stop-and-ask) and its prerequisites pass, run it via Bash from its `Run from` directory (the repo root when it came from discovery), capturing its full output. Full suites can run long — use a generous Bash timeout (up to the maximum available) or run the command in the background and wait for completion, rather than letting a long suite get cut off mid-run. Do not parse or summarize that output here — the raw captured output is handed to Phase 4, which parses pass/fail/skip counts from it.

## Phase 2 — Resolve and validate scope

This phase runs once per prefix group (Phase 0), against that prefix's repo. It applies no matter how the requested tokens arrived: passed directly as the invocation argument, or picked by the user from the list Phase 0's no-argument "Scoped" path presented.

### Availability gate

Before touching any token, check whether the prefix's repo has `.claude/skills/test-strategy/SKILL.md`. This check runs first, ahead of any token handling below. If the repo has only the old `.claude/rules/` file, print Phase 1's migration hint first.

If it does not exist, scoped mode is unavailable for that prefix — regardless of who invoked this skill (this skill never branches on "am I being called by execute vs. a direct user"; see Phase 0's note on this).

- **Single prefix** (every token, including any `full:<repo>`, shares one prefix): tell the user exactly:

  > Scoped mode isn't available in this project yet — no `.claude/skills/test-strategy/SKILL.md` found. Run `/make-it-work:define-test-strategy` first, or invoke this skill with `full` instead.

  ...and stop. Do not fall back to running the full suite instead, and do not print a Phase 5 report block — this is a hard stop, not a degraded result.
- **Several prefixes:** the gate stops only this prefix's scope tokens. List them as unmapped with reason `no test strategy`, and continue with the other prefixes. This prefix's `full:<repo>` token, if any, still runs through Phase 1.

### Validate scope tokens

If the strategy exists, validate the prefix and every requested domain/UC token before running anything.

**Prefix.** Phase 0 found the repo by directory name; a prefix with no such directory is `repo not found` for all its tokens. If the directory isn't a git repo, or its strategy has no readable `## Repo ID`, its tokens are `unrecognized repo`. If the strategy's `## Repo ID` differs from the prefix, warn that tags use `<Repo ID>` and the repo should be cloned as `<Repo ID>`, then continue, using the recorded Repo ID for canonical tokens and the Phase 3 scan. A `full:<repo>` token is validated only for existence (`repo not found`).

**Remainder.** Validate it against that repo's actual inventory.

**Inventory source:** read `.claude/skills/` directory names (`uc-*`/`domain-*`). If that directory pattern isn't present in this repo, fall back to reading `.claude/rules/product.md`'s UC table and `.claude/rules/architecture.md`'s Functional Domains table instead.

**Matching rules** (apply whichever inventory source was used):
- **UC token vs. directory:** match `UC-{id}` case-insensitively as a prefix against `uc-{id}-` — keep the trailing hyphen in the comparison, so `UC-1` does not incorrectly match a directory named `uc-10-...`.
- **Domain token vs. directory:** `domain-{name}` must match the directory name exactly.
- **UC token vs. table fallback:** compare the `{id}` part of the token against the `ID` column of `product.md`'s UC table.
- **Domain token vs. table fallback:** `architecture.md`'s Functional Domains table's `Domain` column holds short names (e.g. `velocity`), not the `domain-` prefixed form — strip the `domain-` prefix from the token before comparing.

For each requested token:
- If no matching directory or table row exists at all under these rules → mark it **"unrecognized"**.
- If a match exists → it is **recognized**; carry it forward using its canonical tag form (`<Repo ID>:UC-{id}` with the id zero-padded as the inventory has it, e.g. `<repo>:UC-08`; `<Repo ID>:domain-{name}`, e.g. `<repo>:domain-velocity`) — not the raw directory name — since Phase 3 greps for this literal tag string.

**Note on "no tests mapped":** whether a recognized token actually has a test tagged with it can only be determined by Phase 3's tag search — that check does not happen in this phase. This phase's own output is therefore only two-valued per token: "unrecognized" (decided here) or "recognized, carried forward" (pending Phase 3's search). Phase 3 is responsible for moving any recognized-but-zero-match token into the unmapped list with reason "no tests mapped" once its search completes.

If, after this validation, a prefix has no recognized token, skip Phase 3 for that prefix. If no prefix has one and there is no `full:<repo>` token, skip Phase 3 and Phase 4 entirely and go straight to Phase 5 with the full unmapped list — there is nothing left to search for or run.

### Outputs of this phase

This phase produces two things for the phases after it:
- **(a) The recognized-token list** (canonical tag form), handed to Phase 3 for tag-based test selection. Phase 3 will further narrow this list to only tokens that actually matched a tagged test.
- **(b) The unmapped list**, handed to Phase 5's final report, with a reason per token. This phase contributes entries reasoned **"unrecognized"**, **"unrecognized repo"**, **"repo not found"** or **"no test strategy"**; Phase 3 later appends entries reasoned **"no tests mapped"** to the same list.

## Phase 3 — Select and filter tests for the requested scope

This phase runs only when Phase 2 handed forward at least one recognized token (output (a) above). If Phase 2 recognized zero tokens — every requested token came back "unrecognized" — Phase 2 already routed straight to Phase 5 with the full unmapped list; this phase is skipped entirely for that run, and no filter command is ever constructed for an empty token list.

### Confirm the tag convention for this prefix

Before searching for anything, read the prefix repo's strategy `## Tag Convention` and `## How to Scan` sections fresh, every run, per prefix — never hardcode the tag form or the scan command. Tags are repo-qualified `@covers` comments inside the test files, matched by content.

### Find matching files

For each token in this prefix's recognized-token list (canonical form, e.g. `<repo>:UC-08`) and each row of its `## Test Locations`, run the `## How to Scan` command from the prefix repo's root over that row's `Location`. Substitute the strategy's Repo ID for `<repo>` and the token's remainder for `<tag>`, escaping as `## How to Scan` says. Keep only paths matching the row's `Test files` glob (relative to its `Location`). Collect the matches per location.

**Rebase each matched path.** Grep returns paths relative to the prefix repo's root (e.g. `../qa-automation/tests/payments/withdraw_ledger.test.js`). Rewrite each one relative to that row's `Run from` (`tests/payments/withdraw_ledger.test.js` for `Run from` `../qa-automation`) before appending it to a command.

### Fold zero-match tokens into the unmapped list

Any recognized token with zero matches in every location of its prefix is moved into the unmapped list (Phase 2's output (b)) with reason **"no tests mapped"** — this is exactly the piece Phase 2 explicitly deferred to this phase (see Phase 2's "Note on 'no tests mapped'"). A token whose only matches are in not-run locations (Phase 1's "Run prerequisites") is not unmapped: those locations are reported as not run.

If, after this search, no location in any prefix has a match (the matched set is empty), do **not** construct a scoped run command at all: move every recognized token into the unmapped list as "no tests mapped", and do **not** fall back to running any full-suite command in their place. Running the full suite here would silently broaden the run beyond the scope the user actually requested. Only `full:<repo>` runs, if any, still go ahead.

### Construct and run the scoped command

Build one run per location with matches, after its Run prerequisites (Phase 1) pass: append that location's rebased files, deduplicated, as positional file arguments to that row's `Full-suite command`, and run it from its `Run from`. Passing one or more file paths directly to a test runner is close to universal across frameworks and languages — unlike a framework-specific name-filter flag, this needs no per-framework syntax at all.

- **Shared locations merge.** When locations from different prefixes resolve to the same `Run from` directory with the same command, they are one run with the union of their files, deduplicated. Its repo is the row's `Repo`.
- **Same file, different commands.** A file already selected for an earlier run is dropped from later ones, so it runs once.
- **`full:<repo>`.** Each token adds one full-suite run (Phase 1), alongside any scoped runs.

**Appending is only valid when the arguments reach the actual test runner.** A location's command is sometimes a wrapper — a `package.json` script invoked as `npm run <script>`, a `Makefile` target invoked as `make <target>`, or a CI job step — and a wrapper does not always forward extra arguments to the runner underneath it:
- For an `npm run <script>` (or `yarn`/`pnpm` script) command, insert `--` before the file paths so the arguments pass through to the underlying runner instead of being consumed by the package manager: `npm run <script> -- path/to/file1 path/to/file2`. Don't add a second `--` when the command already ends with one (e.g. `npm test --`).
- For a `make <target>` command, do not append the file paths directly to the `make` invocation. Instead, read the target's body in the `Makefile` to find the underlying test-runner invocation it wraps, and apply the file paths to that underlying command directly (or invoke the detected runner directly with the same arguments the target would otherwise use).
- For a CI-config-derived command, apply the same rule: append to the runner invocation itself, not to any wrapper script around it.
- If, after this check, no way is found to reliably attach the file paths so they reach the actual runner, do **not** run the wrapper command unscoped — that would silently broaden the run past the requested scope, the same failure mode this phase already guards against for a zero-match scope. Instead, skip this location's run, tell the user its matched tests were found but that location's command couldn't be restricted to just those files, and list the affected tokens under `Unmapped scope (not run)` in Phase 5 with reason "matched files can't be passed to the runner", rather than running anything wider.

Once a valid command is constructed, run it via Bash the same way Phase 1 runs the full-suite command: capture its full output, and use a generous timeout (up to the maximum available), or run it in the background and wait for completion, rather than letting it get cut off mid-run. Hand the exit code and captured output to Phase 4.

**Limitations (accepted):** a file containing a matching tag runs whole; other tests in that file may also run.

## Phase 4 — Determine the gate result

This phase runs once per executed run: each Phase 1 full-suite run and each Phase 3 scoped run that actually ran. Only executed runs produce a result; a not-run location (Phase 1's "Run prerequisites") or a zero-match location produces none — see "Nothing was ever run" below for what Phase 5 reports when no run executed.

### Gate result

**PASS** if the command exited with status code `0`. **FAIL** otherwise. A nonzero exit code is the test runner's own universal signal that something in the run didn't pass — this skill never needs to recognize or parse any framework-specific summary output to make this determination, for any language or framework.

**Overall result** (across every executed run of this invocation):
- **PASS** when every executed run exited `0` and at least one run executed.
- **FAIL** when any executed run failed, or (bare `full` in a workspace only) any repo hit Phase 1's stop-and-ask.
- **No result** when no run executed — see below.

Not-run locations and unmapped tokens never count as FAIL.

### Captured output

Keep the full captured output from the run (Phase 1's or Phase 3's). Do not attempt to parse or count individual test results from it — every framework formats this differently, and the exit code already settled the gate result. On a **FAIL** result, hand the last portion of this output (enough to show the actual failure, capped at a reasonable length) to Phase 5 for inclusion in the report, so the caller has something to act on beyond the bare PASS/FAIL.

### Nothing was ever run

No run executes when every requested item ends up in one of these:
- a token that is unrecognized, `unrecognized repo`, `repo not found` or `no test strategy` (Phase 2);
- a token with no tests mapped (Phase 3);
- a token whose matched files couldn't be passed to the runner (Phase 3's wrapper refusal);
- a matched or full-suite location that is not run (Phase 1's "Run prerequisites": `ci-only`/`slow`/`flaky`, env var unset, service unavailable, `no tests in repo`);
- a `full:<repo>` token recorded as `not run — no full-suite command found` (Phase 1).

Then there is no result. Phase 5 lists these under `Not run:` and `Unmapped scope (not run)`, and prints no `Gate result:` or `Overall gate result:` label anywhere — not even in an explanatory sentence.

A bare `full`'s stop-and-ask (Phase 1, undiscoverable command) is separate: see Phase 5's "Stop-and-ask conditions and this phase".

### Outputs of this phase

Per executed run, this phase produces, for Phase 5 to assemble into the final report:

- **Gate result** (PASS/FAIL, per the exit-code rule above)
- **Captured output tail**, only when the result is FAIL

Across the invocation it also produces the overall result (PASS, FAIL, or none when nothing executed).

## Phase 5 — Report results

This is the final phase: it assembles whatever the earlier phases produced into fixed chat blocks, one per executed run (plus, for a bare `full` workspace, a repo whose command couldn't be discovered), and prints them. **Nothing here is written to disk, and nothing is read back from disk** — the one exception, orthogonal to this phase, is `--autopilot`'s own decision log at `make-it-work/run-regression-autopilot-log.jsonl` (see Autopilot Mode), which is written before Phase 5 ever runs and isn't part of this phase's own output. The report is returned live, in the same chat turn, to whichever session invoked this skill — a direct user invocation or the `execute` skill's own completion-gate call — per the spec's Decision Log ("no persisted file — return the result live to the caller only"). There is no report file for a re-run to check for or overwrite, and no raw test-runner log is ever pasted into the chat response: only the fixed lines and blocks below, plus a FAIL block's captured output tail. The stop-and-ask conditions that can precede or replace this phase entirely — Phase 0's "could not identify the project root," Phase 1's per-repo undiscoverable-command stop, and Phase 2's single-prefix availability gate — are each handled exactly as described under "Stop-and-ask conditions and this phase" below; none of them prints raw test-runner output either.

Which format applies depends on the invocation: a bare `full` uses the full-suite format; any token run uses the token-run format.

### The full-suite block (bare `full`)

Print exactly this shape, once per repo that has one (see "How many blocks: full-suite mode" below):

```
Mode: Full suite
Repo: <repo name>
Suite(s) run: <the full-suite command actually executed, or "None" when it couldn't be discovered>
Unmapped scope (not run): None
Gate result: <PASS | FAIL>  [Reason: <reason string, only when one applies — see "Filling in Gate result and Reason" below>]
```

On a **FAIL** result, print the captured output tail (Phase 4's "Captured output") immediately after this block, so the reader has something to act on beyond the bare result.

Every field is always present; a field with nothing to report still prints its label with `None`, rather than being omitted. `Repo:` always names exactly one repo — a workspace is never named on this line; see "How many blocks: full-suite mode" for the separate workspace-level line a multi-repo run prints.

### Filling in each field

- **Mode** — `Full suite` in a full-suite block; `Scoped` or `Full suite` in a token-run block (see below). Never mixed within one block.
- **Repo** — this one block's single repo name, always. For a merged token run (Phase 3's "Shared locations merge"), it is the row's `Repo` column (e.g. `qa-automation`). A multi-repo run never puts a count on this line — that is reported once, on its own leading `Workspace:` line before the first block.
- **Suite(s) run** — the exact command actually executed for this run: Phase 1's full-suite command, or Phase 3's constructed scoped command (that location's command with the rebased file paths appended). `None` only in a full-suite block whose command couldn't be discovered (Phase 1's stop-and-ask, workspace run).
- **Unmapped scope (not run)** — full-suite blocks always print `None` here; full-suite mode has no requested scope to leave unmapped. Token runs report unmapped scope once, on a closing line (see the token-run format).

### Filling in Gate result and Reason

`Gate result` is `PASS` or `FAIL` per Phase 4's exit-code rule. The bracketed `Reason:` is printed only when the phases produced one — never invented, never printed as an empty placeholder — drawn verbatim from whichever of these fired, in the exact wording given here:

- **Phase 1's stop-and-ask (bare `full`, workspace run, per repo):** when this repo's own Phase 1 could not discover a full-suite test command at all, no command ever ran for it. This repo's block reports `Gate result: FAIL` with the fixed reason `Reason: could not discover a full-suite test command for this repo` — a distinct, fixed string, not a paraphrase — reflecting Phase 1's own stop message ("Could not find a full-suite test command for `<repo>`..."). `Suite(s) run: None`.
- **A plain exit-code FAIL:** when the command Phase 1 or Phase 3 ran exited nonzero, `Gate result: FAIL` with no `Reason:` — the captured output tail printed after the block (per Phase 4) already shows why. This single case covers every way a real test run can fail, regardless of framework.
- **PASS:** no `Reason:` is ever printed alongside `Gate result: PASS`.

Token-run blocks never carry a `Reason:`: every token-run block is an executed run, so its result is always one of the last two cases.

### Not run and unmapped never FAIL

A not-run location or an unmapped token does not, by itself, fail the gate, and never gets a block. A run where one matched location passes while another location is `ci-only` and another token is unmapped reports `Overall gate result: PASS`, with the others listed on the `Not run:` and `Unmapped scope (not run)` lines — Phase 4's rule governs only the runs that executed. When no run executed at all, there is no result (Phase 4's "Nothing was ever run").

### Stop-and-ask conditions and this phase

Three conditions can stop the run before or instead of a normal report, each handled differently by this phase:

- **Phase 0's "Could not identify the project root":** this fires before mode or repo scope is even known. Phase 0's message is shown and the run stops there — no Phase 5 block is printed for it, for any repo.
- **Phase 2's availability gate (single prefix):** the prefix's repo has no `.claude/skills/test-strategy/SKILL.md`. Phase 2's message is shown and the run stops there — no Phase 5 report is printed, per Phase 2's own instruction. With several prefixes, it is not a stop: that prefix's tokens appear under `Unmapped scope (not run)` with reason `no test strategy`.
- **Phase 1's stop-and-ask (bare `full`, per repo):** this repo's full-suite command could not be discovered. Phase 1's verbatim message is shown for that repo. What happens next depends on how many repos are in scope:
  - **Single-repo full-suite run:** this is the only repo, so this is a hard stop for the whole invocation, the same as Phase 0's and Phase 2's stops above — the run pauses for the user to supply a command (per Phase 1) or ends there; no Phase 5 block is printed unless/until a command is supplied and the run proceeds normally to a real Suite(s) run/Passed/Failed/Skipped outcome. Do not print the words `Gate result:` anywhere in this hard-stop response, even in an explanatory sentence such as "there is no Gate result"; that label is reserved for an actual Phase 5 block.
  - **Multi-repo full-suite run:** per Assumption 5's per-repo independence, this one repo's stop-and-ask does not pause the rest of the workspace run. This repo's block is printed with `Gate result: FAIL` and the fixed reason from "Filling in Gate result and Reason" above, and the run proceeds to attempt every other repo in the workspace — this is exactly the case named in "How many blocks: full-suite mode" below.

### How many blocks: full-suite mode

A bare `full` runs Phase 1 once per repo in scope: every repo in a detected workspace, or the one repo in a single-repo project (per Phase 0). Each repo runs only its own first `## Test Locations` row, so a repo either executes, hits the stop-and-ask, or is not run (Phase 1's "Run prerequisites") — a not-run repo never gets a block and never counts as FAIL.

- **Single-repo full-suite run:** print exactly one block, then `Not run: None`, with no leading workspace line and no `Overall gate result` line — the block's own `Gate result` line is the final word. If the repo is not run, print no block, only `Not run: <repo> — <reason>` (e.g. `Not run: payments-api — no tests in repo`); there is then no gate result, and no `Gate result:` label may appear anywhere in the response.
- **Multi-repo full-suite run (a detected workspace):** print one leading line, `Workspace: <n> repos`, naming how many repos are in scope; then one block per repo that executed or hit the stop-and-ask, in turn, each with its own `Repo:` line naming that repo. Per Assumption 5's per-repo independence, every repo in scope is processed on its own: one repo's command being undiscoverable, or one repo's suite failing, never causes this skill to stop early or silently omit any other repo — the run still attempts and reports every remaining repo. After the blocks, print `Not run: <repo — reason; … | None>`, then `Overall gate result:`. For example:

  ```
  Workspace: 4 repos

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

  Not run: docs-site — no tests in repo
  Overall gate result: FAIL
  ```

  The closing `Overall gate result: <PASS | FAIL>` line is `FAIL` if any block's own `Gate result` is `FAIL` (a real test failure or a repo whose command couldn't be discovered); `PASS` when every block's `Gate result` is `PASS` and there is at least one block. Not-run repos never count as FAIL. When every repo is not run, there are no blocks and no `Overall gate result:` line — there is no result. Neither the leading `Workspace:` line nor this closing `Overall gate result:` line ever appears for a single-repo run.

### How many blocks: token runs

Every token run — any number of prefixes, any number of executed runs, including exactly one — prints this exact grammar, so callers parse one shape:

```
Workspace: <n> runs
Mode: <Scoped + full | Scoped>

Repo: <repo>
Mode: <Scoped | Full suite>
Suite(s) run: <the command actually executed>
Gate result: <PASS | FAIL>

...one block per executed run...

Not run: <location — reason; … | None>
Unmapped scope (not run): <tokens — reason; … | None>
Overall gate result: <PASS | FAIL>
```

- **Leading lines.** `<n>` is the number of executed runs (blocks), `0` when nothing executed. The leading `Mode:` is `Scoped + full` when any `full:<repo>` token is present, otherwise `Scoped`.
- **Blocks.** One per executed run, in run order: Phase 3's scoped runs (`Mode: Scoped`), then each `full:<repo>` run (`Mode: Full suite`). A not-run location or a zero-match location never gets a block. On a FAIL block, print the captured output tail immediately after it.
- **`Not run:`** — every location not run per Phase 1's "Run prerequisites", and every `full:<repo>` not run, on one line, entries separated by `; `: `<repo>: <Location> — <reason>` for a location (e.g. `payments-api: ../qa-automation/tests/e2e — ci-only`), `<repo> — <reason>` for a `full:<repo>` token (e.g. `ledger-api — no tests in repo`, `ledger-api — no full-suite command found`). `None` when empty.
- **`Unmapped scope (not run)`** — Phase 2's and Phase 3's combined unmapped list, on one line, each token with its own reason: `unrecognized`, `unrecognized repo`, `repo not found`, `no test strategy`, `no tests mapped`, or `matched files can't be passed to the runner` (e.g. `payments-api:domain-nonexistent — unrecognized; payments-api:UC-99 — no tests mapped`). `None` when empty.
- **`Overall gate result:`** — per Phase 4's overall rule. When no run executed, omit this line entirely and print no `Gate result:` label anywhere in the response.

For example, `payments-api:UC-08 full:payments-api` where `UC-08` is tagged in `payments-api` itself, in `qa-automation`'s payments tests, and in a `ci-only` e2e location:

```
Workspace: 3 runs
Mode: Scoped + full

Repo: payments-api
Mode: Scoped
Suite(s) run: npm test -- test/withdraw.test.js
Gate result: PASS

Repo: qa-automation
Mode: Scoped
Suite(s) run: npm test -- tests/payments/withdraw_flow.test.js
Gate result: PASS

Repo: payments-api
Mode: Full suite
Suite(s) run: npm test
Gate result: PASS

Not run: payments-api: ../qa-automation/tests/e2e — ci-only
Unmapped scope (not run): None
Overall gate result: PASS
```
