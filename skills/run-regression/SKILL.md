---
description: "Runs a project's regression suite — full or scoped to specific domains/use-cases — and reports pass/fail results; the shared implementation `execute` calls at the end of a plan. Use when running or checking a project's test suite, full or scoped to specific domains/use-cases."
---

# Run Regression

## Usage

```
/make-it-work:run-regression [--autopilot] [full | domain-<name> | UC-<id> ...]
```

- **No argument** — asks the user whether to run the full suite or a specific scope.
- **`full` or `full-suite`** — runs the full suite, no prompt.
- **One or more space-separated domain/UC tokens** (e.g. `domain-velocity UC-08`) — runs a scoped subset covering just those domains/use-cases, no prompt.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing. `--autopilot` is parsed and stripped as a flag before the remaining tokens are classified as `full`/`full-suite`/`domain-*`/`UC-*` — it may appear anywhere in the argument list (e.g. `--autopilot full`, `domain-velocity --autopilot`) and never counts as "no argument" or as an unrecognized scope token on its own. Invoking `--autopilot` with no scope argument resolves to `full` — see Autopilot Mode.

This skill is invoked both directly by a user and by the `execute` skill's own instructions passing an already-resolved argument.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — the exact option labels, `multiSelect` settings, and list-vs-picker thresholds all still apply and get exercised on every run — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard-stop exception:** no destructive or irreversible action exists anywhere in this skill — `run-regression` runs tests and reports results; it never overwrites, discards, or replaces any existing file or state (see Phase 5: nothing is ever written to disk except the autopilot log below). There is therefore no destructive-action analog to name as a hard-stop exception, stated explicitly rather than omitted.

**Mode choice default:** the Phase 0 mode choice (Full suite vs. Scoped, the "No argument" case below) resolves automatically when `--autopilot` is invoked with no `full`/`full-suite`/`domain-*`/`UC-*` argument: choose the option labeled `(Recommended)` — `Full suite` (see its label in Mode resolution below). Full suite is the broadest, non-destructive option — it runs every test, nothing is narrowed or skipped — which is why it's the safe unattended default rather than `Scoped`, which would otherwise need its own follow-up domain/UC picker with no way to ask it unattended.

**Decision log:** write `.claude/run-regression-autopilot-log.jsonl` at repo root, created fresh (truncated to empty) at the very start of every `--autopilot` invocation, before any site is checked, and appended to as each site below is reached. This is the only file this skill ever writes under any invocation — every other phase (notably Phase 5) writes nothing to disk at all; see Phase 5's own note. A run where zero interactive sites fire — the common case, since an explicit `full`/`domain-*`/`UC-*` argument with an unambiguous single repo hits none of the sites below — still leaves behind an empty log file; its bare existence is the evidence `--autopilot` engaged, even when nothing needed resolving. One JSON object per line:
- `phase` — e.g. `"Phase 0"`, `"Phase 1"`.
- `site` — a short slug, e.g. `"mode-choice"`, `"repo-ambiguity"`, `"no-command"`.
- `kind` — one of `"askUserQuestion"` (a real question/options payload was constructed), `"checkpoint"` (a plain-text pause/ask point was auto-resolved).
- `multiSelect` — boolean, only present when `kind` is `"askUserQuestion"`.
- `question`, `options` — the exact constructed payload, only present when `kind` is `"askUserQuestion"`.
- `chosen` — a string for single-select, an array of strings for `multiSelect: true`, or `null` for a site that stopped rather than resolving.
- `rationale` — one sentence.

**Resolution table** (one row per interactive site):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 0 | mode choice, no argument (Full suite vs. Scoped) | `askUserQuestion` | Choose the option labeled `(Recommended)` — `Full suite`. |
| Phase 0 | ambiguous repo pick among unrelated clones with no unifying doc | `checkpoint` | No safe default — which repo even exists isn't a product-policy choice to infer. Stop and require a human. |
| Phase 0 | ambiguous workspace-repo target for a scoped run | `askUserQuestion` | No safe default, same reasoning as above. Stop and require a human. |
| Phase 0 | combined domain/UC candidate-list confirmation (only reachable when "Scoped" is chosen with no tokens given) | `askUserQuestion` / `checkpoint` | Unreachable under autopilot: the mode-choice site above always resolves to `Full suite`, never `Scoped`, when no argument is given — so this site is never reached unattended. If a future change to the mode-choice resolution ever makes `Scoped` autopilot's choice, treat this the same as the other no-default sites above: stop and require a human. |
| Phase 1 | stop-and-ask fallback — no discoverable full-suite command for this repo, single-repo run | `checkpoint` (deliberately **not** treated as an open-ended best-guess site) | Never invent a test command here — a guessed command could produce a false PASS or FAIL that has nothing to do with this project's real suite, which this skill's own "never a false pass" invariant forbids. Print Phase 1's stop message verbatim, print no Phase 5 block, and stop. A multi-repo run needs no resolution at this site at all: Phase 5 already reports that one repo's block automatically (`Gate result: FAIL`, fixed reason) and the run proceeds to the rest of the workspace regardless of `--autopilot`. |

Two sites in this skill are deterministic gates, not questions, and need no autopilot resolution at all because they already behave identically with or without `--autopilot`: Phase 2's scoped-mode availability gate (no `testing-strategy.md`) and Phase 3's wrapper-attachment refusal (matched tokens whose file paths can't be reliably attached to the discovered runner). Phase 0's "could not identify the project root" stop is the same — a hard stop with no human input that could resolve it, unaffected by autopilot.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision (or the single "stopped — no default/no command" decision, when that's what happened) and the decision log's path, so someone can audit the run afterward.

## Phase 0 — Resolve repo context and mode (autopilot: see Autopilot Mode)

### Repo/workspace detection

Reuse `plan-the-work`'s Step 1a logic verbatim to decide whether this is a **single repo** or a **coordinated multi-repo workspace**. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.

1. **`.git` exists here.** This repo is a project root. Then:
   - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`).
   - Otherwise → **single-repo project**, root is here — even if the parent happens to contain other, unrelated repos.
2. **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here. If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to run against, rather than guessing. (autopilot: see Autopilot Mode)
3. **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop.

Full-suite mode (Phase 1) iterates every repo in a detected workspace. Scoped mode (Phase 2 onward) operates against exactly one repo. If a workspace is detected and no single repo is unambiguous from context (e.g. the invocation directory), list the affected repos and ask the user which one this scoped run targets via a single `AskUserQuestion` call (`multiSelect: false`), before proceeding to Phase 2 for that repo only. (autopilot: see Autopilot Mode)

### Mode resolution (autopilot: see Autopilot Mode)

Resolve the mode from the invocation argument (per the Usage syntax above). `--autopilot` is stripped before this classification runs (see Usage) and never itself counts as "no argument":

- **No argument** → ask the user, via a single `AskUserQuestion` call (`multiSelect: false`), whether to run the full suite or a specific scope:
  - `{ label: "Full suite (Recommended)", description: "Run every test." }`
  - `{ label: "Scoped to specific domain(s)/use-case(s)", description: "Focus on the flows you're actively touching." }`

  If **"Full suite"** is chosen, proceed to Phase 1. If **"Scoped"** is chosen, first check whether `.claude/rules/testing-strategy.md` exists in this repo — the same availability gate Phase 2 defines. If it does not exist, skip straight to Phase 2's availability-gate message and stop; do not present a domain/UC picker for a project where scoped mode can't run anyway. Only once that file's presence is confirmed, and the user gave no tokens, read the target repo's `.claude/rules/product.md` UC table and `.claude/rules/architecture.md` Functional Domains table, and present the combined list:
  - as multi-select options (`AskUserQuestion`, `multiSelect: true`) if there are 4 or fewer combined rows;
  - otherwise as a plain-text list to choose from/confirm.

  This mirrors a confirmation-checkpoint pattern used elsewhere in this plugin's skills: show the candidate list, get explicit confirmation before proceeding, never invent flows from scratch. (autopilot: see Autopilot Mode — unreachable under autopilot today, since reaching it requires the no-argument mode choice above to have already resolved to "Scoped," which autopilot never does unattended.)

- **`full` or `full-suite`** (case-insensitive) → proceed straight to Phase 1, no prompt.
- **One or more tokens matching `domain-{name}` or `UC-{id}`** → proceed straight to Phase 2 with those tokens as the requested scope, no prompt.
- **Any other argument** → tell the user the argument wasn't recognized as `full` or a `domain-*`/`UC-*` token, and fall through to the no-argument prompt above rather than guessing.

**Note:** this skill never attempts to infer who invoked it (a user typing a command vs. another skill's instructions calling it) — it only ever reacts to the argument it was given. This is a deliberate design decision: the `execute` skill is responsible for always passing an already-resolved argument (a computed scope, or literally `full`) rather than this skill trying to detect "is my caller the completion gate."

## Phase 1 — Discover and run the full suite

Run this phase once per repo in scope: every repo in a detected workspace, or the one repo in a single-repo project (per Phase 0's repo/workspace detection).

### Discovery order

1. **Check for a test-strategy file.** Look for `.claude/rules/testing-strategy.md` in this repo. If it exists, read its `## Commands` section — this is the primary, authoritative source: `define-test-strategy` generates this file and its own instructions state explicitly that this `## Commands` section is "the section the `run-regression` skill reads to find 'the full suite command.'" That section records both the full-suite command and one example command per test layer — use only the documented full-suite command, never a per-layer example command. If the section exists but has no full-suite entry, fall through to step 2 below exactly as if the file/section were absent.
2. **Fall back to the same discovery order `plan-the-work` uses** if that file or section is absent, or has no full-suite entry, for this repo: check `package.json` scripts, `Makefile` targets, and CI config (e.g. `.github/workflows/`) for a full-test/regression command. The only exclusions are build, lint, and type-check commands — a plain `test` script or target (even one that only runs unit tests, e.g. a bare `jest`/`vitest` invocation) is a usable full-suite command on its own. If several test-related commands exist, prefer the broadest one (`test:all`, `test:ci`, or a CI job step that runs the whole suite) over a narrower `test`.

### Stop-and-ask fallback (autopilot: see Autopilot Mode)

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

Before searching for anything, read this repo's `.claude/rules/testing-strategy.md` `## UC/Domain Tag Convention` section fresh, every run — never hardcode the tag form. `define-test-strategy` tags a test file purely by its own path: the tag token appears as a substring of the file's directory name and/or filename, matched case-insensitively with `-`/`_` treated as interchangeable, respecting the id's trailing-digit boundary (`UC-08` must never match inside `UC-081`). This is deliberately framework/language-agnostic — there is no per-framework variant to branch on.

A placeholder test additionally carries a marker as its file's first line (`baseline placeholder scaffolded by define-test-strategy`) — see "Placeholder-only tokens" below.

### Find matching files

For each token in Phase 2's recognized-token list (canonical tag form, e.g. `UC-08`, `domain-velocity`), search this repo's test file **paths** — a `find`/glob over directory names and filenames, never a search through file content — for that tag token as a substring, per the rule above. Record, per token, every file path that matched.

Because this is a path search rather than a content search, there is no separate "search predicate vs. filter flag" alignment problem to manage — the files this step finds are exactly the files Phase 3's "Construct and run the scoped command" below will pass to the test runner, by construction.

### Fold zero-match tokens into the unmapped list

Any recognized token with zero matching file paths is moved into the unmapped list (Phase 2's output (b)) with reason **"no tests mapped"** — this is exactly the piece Phase 2 explicitly deferred to this phase (see Phase 2's "Note on 'no tests mapped'"). Only tokens with at least one matching file remain in the "matched" set carried forward through the rest of this phase.

If, after this search, every recognized token ends up with zero matches (the matched set is empty), do **not** construct a run command at all: move all of them into the unmapped list as "no tests mapped", skip straight to Phase 5, and do **not** fall back to running the full-suite command Phase 1 discovered for this repo. Running the full suite here would silently broaden the run beyond the scope the user actually requested.

### Placeholder-only tokens (informational only — never affects the gate)

For each token that matched at least one file, additionally check whether **every** one of its matching files' first line carries the marker phrase `baseline placeholder scaffolded by define-test-strategy` (case-insensitive) — the same marker `define-test-strategy` writes. If so, record this token as **placeholder-only** for Phase 5's report.

This is purely informational. A placeholder-only token is still included in the file set Phase 3 runs below, never excluded or treated specially — the runner's own native skip/pending state for that file (per `define-test-strategy`'s own "Never a failing or silently-passing placeholder" invariant) already keeps it from ever causing a failure, so nothing here needs to special-case it for the gate to come out right. See Phase 4 for why this is automatic.

### Construct and run the scoped command

If at least one token matched (the matched set is non-empty), construct the scoped run command by appending the matched file paths — all of them, from every matched token, deduplicated — as positional file arguments to the full-suite command Phase 1 already discovered for this repo. Passing one or more file paths directly to a test runner is close to universal across frameworks and languages — unlike a framework-specific name-filter flag, this needs no per-framework syntax at all.

**Appending is only valid when the arguments reach the actual test runner.** Phase 1's discovered command is sometimes a wrapper — a `package.json` script invoked as `npm run <script>`, a `Makefile` target invoked as `make <target>`, or a CI job step — and a wrapper does not always forward extra arguments to the runner underneath it:
- For an `npm run <script>` (or `yarn`/`pnpm` script) command, insert `--` before the file paths so the arguments pass through to the underlying runner instead of being consumed by the package manager: `npm run <script> -- path/to/file1 path/to/file2`.
- For a `make <target>` command, do not append the file paths directly to the `make` invocation. Instead, read the target's body in the `Makefile` to find the underlying test-runner invocation it wraps, and apply the file paths to that underlying command directly (or invoke the detected runner directly with the same arguments the target would otherwise use).
- For a CI-config-derived command, apply the same rule: append to the runner invocation itself, not to any wrapper script around it.
- If, after this check, no way is found to reliably attach the file paths so they reach the actual runner, do **not** run the wrapper command unscoped — that would silently broaden the run past the requested scope, the same failure mode this phase already guards against for a zero-match scope. Instead, stop for this run, tell the user the requested scope's tests were matched but the discovered full-suite command couldn't be restricted to just those files, and report the affected tokens as unmapped with reason "no tests mapped" in Phase 5 rather than running anything wider.

Once a valid command is constructed, run it via Bash the same way Phase 1 runs the full-suite command: capture its full output, and use a generous timeout (up to the maximum available), or run it in the background and wait for completion, rather than letting it get cut off mid-run. Hand the exit code and captured output to Phase 4.

**v1 limitations (accepted, not fixed here):** path-substring matching can occasionally overmatch the same way any substring match can (e.g. `domain-velocity` also matching a file path containing `domain-velocity-reports`); and a project that colocates many use cases' or domains' tests inside one shared file, rather than one file per use case/domain, can't be scoped at file granularity — those tests are only reachable via the full suite. Both are accepted v1 rough edges, consistent with Phase 2's own accepted v1 limitations.

## Phase 4 — Determine the gate result

This phase runs once per repo/run against the command that was actually executed: Phase 1's full-suite run, or Phase 3's scoped run when Phase 3 constructed and ran one. If neither ran for this repo, skip this phase entirely for that repo/run — see "Nothing was ever run for this repo" below for what Phase 5 reports instead.

### Gate result

**PASS** if the command exited with status code `0`. **FAIL** otherwise. A nonzero exit code is the test runner's own universal signal that something in the run didn't pass — this skill never needs to recognize or parse any framework-specific summary output to make this determination, for any language or framework.

This is deliberately simple, and it's exactly what makes a placeholder/stub test automatically safe without any special-casing here: a scaffolded placeholder (per `define-test-strategy`'s own "Never a failing or silently-passing placeholder" invariant) always uses the runner's own native skip/pending mechanism, and a skipped/pending test does not produce a nonzero exit code in any mainstream test runner. So a scoped or full-suite run that includes nothing but placeholder tests, or a mix of placeholders and passing real tests, already reports **PASS** with nothing in this skill having to recognize, exclude, or count them.

### Captured output

Keep the full captured output from the run (Phase 1's or Phase 3's). Do not attempt to parse or count individual test results from it — every framework formats this differently, and the exit code already settled the gate result. On a **FAIL** result, hand the last portion of this output (enough to show the actual failure, capped at a reasonable length) to Phase 5 for inclusion in the report, so the caller has something to act on beyond the bare PASS/FAIL.

### Nothing was ever run for this repo

When Phase 2 (every requested token unrecognized) or Phase 3 (every recognized token matched zero files) routes straight to Phase 5 because nothing was ever executed for this repo, Phase 4 is skipped entirely for that repo/run — there is no command to have exited. In both of these scoped-mode cases, Phase 5 reports:

- **Gate result: FAIL**
- **Reason:** "no tests executed for the requested scope"

This section covers only the scoped-mode routes above. Full-suite mode has its own, separate way of reaching this phase without anything having run: Phase 1's stop-and-ask condition (this repo's full-suite test command couldn't be discovered at all). That case skips this phase for the same reason — there is no command to have exited — but Phase 5 reports it with its own distinct reason naming that the command couldn't be discovered, not the "no tests executed for the requested scope" wording above, which is reserved for the scoped-mode routes. See Phase 5's "Filling in Gate result and Reason" for exactly how each of these is worded.

### Outputs of this phase

Per repo/run, this phase produces, for Phase 5 to assemble into the final report:

- **Gate result** (PASS/FAIL, per the exit-code rule above)
- **Captured output tail**, only when the result is FAIL
- **Any "nothing was ever run" condition**, with its reported reason string, when it applies

## Phase 5 — Report results

This is the final phase: it assembles whatever the earlier phases produced for each repo in scope into one fixed chat block per repo, and prints it. **Nothing here is written to disk, and nothing is read back from disk** — the one exception, orthogonal to this phase, is `--autopilot`'s own decision log at `.claude/run-regression-autopilot-log.jsonl` (see Autopilot Mode), which is written before Phase 5 ever runs and isn't part of this phase's own output. The report is returned live, in the same chat turn, to whichever session invoked this skill — a direct user invocation or the `execute` skill's own completion-gate call — per the spec's Decision Log ("no persisted file — return the result live to the caller only"). There is no report file for a re-run to check for or overwrite, and no raw test-runner log is ever pasted into the chat response: only the fixed summary block below, plus (for a multi-repo full-suite run only) the one leading line described in "How many blocks: full-suite mode" below. The three stop-and-ask conditions that can precede or replace this phase entirely — Phase 0's "could not identify the project root," Phase 1's per-repo undiscoverable-command stop, and Phase 2's scoped-mode availability gate — are each handled exactly as described under "Stop-and-ask conditions and this phase" below; none of them prints raw test-runner output either.

### The fixed block

Print exactly this shape, once per repo (see "How many blocks: full-suite mode" and "How many blocks: scoped mode" below for which repos get one, and in what order relative to any stop-and-ask message):

```
Mode: <Full suite | Scoped>
Repo: <repo name>
Suite(s) run: <the command actually executed — the full-suite command, plus any matched file paths appended in Scoped mode — or "None" when nothing ever ran for this repo>
Placeholder-only scope (informational): <comma-separated list of requested tokens whose only matching coverage is still a scaffolded placeholder, or "None">
Unmapped scope (not run): <comma-separated list, or "None"> — <"unrecognized" or "no tests mapped" reason per name>
Gate result: <PASS | FAIL>  [Reason: <reason string, only when one applies — see "Filling in Gate result and Reason" below>]
```

On a **FAIL** result, print the captured output tail (Phase 4's "Captured output") immediately after this block, so the reader has something to act on beyond the bare result.

Every field is always present; a field with nothing to report still prints its label with `None`, rather than being omitted — this keeps every block the same shape whether the run was a clean pass, a real failure, or a stop-and-ask condition. `Repo:` always names exactly one repo — a workspace is never named on this line; see "How many blocks: full-suite mode" for the separate workspace-level line a multi-repo run prints.

### Filling in each field

- **Mode** — `Full suite` or `Scoped`, per Phase 0's mode resolution. Never mixed within one block.
- **Repo** — this one block's single repo name, always. A multi-repo full-suite run never puts `workspace: <n> repos` on this line — that count is reported once, on its own leading line before the first block (see "How many blocks: full-suite mode" below), and every block underneath it still names its own one repo here.
- **Suite(s) run** — the exact command actually executed for this repo/run: Phase 1's full-suite command, or Phase 3's constructed scoped command (the same full-suite command with the matched file paths appended). Print `None` when nothing ever ran for this repo — this is always the case whenever the "Nothing was ever run" handoff fired, from any of the points in the flow that can produce it (Phase 1's stop-and-ask, or Phase 2/Phase 3's scoped-mode routing, per "Filling in Gate result and Reason" below).
- **Placeholder-only scope (informational)** — scoped mode only. Every requested token whose matched files are *all* still scaffolded placeholders (Phase 3's "Placeholder-only tokens"), listed by name. Print `None` when the list is empty. **Full-suite mode always prints `None` here** — this line exists only to flag a scoped request whose coverage is currently placeholder-only; it never affects `Gate result`, since a placeholder-only run already reports PASS on its own (Phase 4).
- **Unmapped scope (not run)** — scoped mode only. Reflects Phase 2's and Phase 3's combined unmapped list for this run: every token Phase 2 marked "unrecognized," plus every token Phase 3 moved over marked "no tests mapped," listed together with each entry's own specific reason (e.g. `nonexistent-domain — unrecognized, UC-99 — no tests mapped`). Print `None` when the list is empty. **Full-suite mode always prints `None` here** — full-suite mode has no requested scope to leave unmapped; this line is a scoped-mode-only concept, never populated for a full-suite block. A nonzero unmapped list never by itself fails the gate: see "Partial scoped runs are not automatically FAIL" below.

### Filling in Gate result and Reason

`Gate result` is `PASS` or `FAIL` per Phase 4's exit-code rule (or, when Phase 4 never ran because nothing was ever executed, the FAIL outcome that condition itself dictates — see below). The bracketed `Reason:` is printed only when the phases produced one for this run — never invented, never printed as an empty placeholder — drawn verbatim from whichever of these fired, in the exact wording given here:

- **Phase 1's stop-and-ask (full-suite mode only, per repo):** when this repo's own Phase 1 could not discover a full-suite test command at all, no command ever ran and Phase 4 never ran for this repo either. This repo's block reports `Gate result: FAIL` with the fixed reason `Reason: could not discover a full-suite test command for this repo` — a distinct, fixed string, not a paraphrase — reflecting Phase 1's own stop message ("Could not find a full-suite test command for `<repo>`..."). `Suite(s) run: None`.
- **Phase 2/Phase 3's "nothing was ever run for this repo" handoff (scoped mode only):** every requested token unrecognized (Phase 2), every recognized token matched zero files (Phase 3), or Phase 3's wrapper-attachment refusal — per Phase 4's own "Nothing was ever run for this repo" section, all three route here with `Gate result: FAIL` and `Reason: no tests executed for the requested scope`, `Suite(s) run: None`, and the full unmapped list populated with each entry's specific reason.
- **A plain exit-code FAIL:** when the command Phase 1 or Phase 3 ran exited nonzero and none of the conditions above applies, `Gate result: FAIL` with no `Reason:` — the captured output tail printed after the block (per Phase 4) already shows why. This single case covers every way a real test run can fail, regardless of framework — there is no separate "could not parse output" or "zero tests executed" condition to distinguish, since the exit code is the only signal this skill relies on.
- **PASS:** no `Reason:` is ever printed alongside `Gate result: PASS`.

### Partial scoped runs are not automatically FAIL

An unmapped entry does not, by itself, fail the gate. A scoped run naming one recognized-and-matched token plus one unrecognized/unmapped token, where the command run for the matched token's files exits `0`, reports `Gate result: PASS` with the unmapped token still listed on the `Unmapped scope (not run)` line — Phase 4's gate rule governs the command that actually ran, over whatever files were matched; being unmapped is orthogonal to whether that run passed. Only the "nothing was ever run" condition (every requested token came back unrecognized or unmapped, so the matched set is empty, and no command ever ran at all) forces `Gate result: FAIL` — that is a property of nothing having executed at all, not of the unmapped list being nonempty.

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
