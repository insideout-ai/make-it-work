---
name: define-test-strategy
description: "Onboards or refreshes a repo's test-strategy skill: discovers tests, discusses layers, approach and adoption, records commands and prerequisites, tags separate test files with repo-qualified @covers comments, infers embedded-test mappings, migrates old outputs, and reports live coverage."
disable-model-invocation: true
---

# Define the Test Strategy

## Usage

```
/make-it-work:define-test-strategy [repo] [--autopilot]
```

Strip `--autopilot` from the arguments wherever it appears; whatever remains is `[repo]`.

- **`[repo]`** — optional. The repo to onboard: a directory under the current directory or under the workspace root. When omitted, the target is the git toplevel of the current directory. One run onboards one repo; repeat the run in each repo.
- **No `--autopilot`** — interactive. Every `AskUserQuestion` and checkpoint below pauses for a human, exactly as documented.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing. Exception: the hard-stop site named in Autopilot Mode is never auto-resolved.

Reuse explicit answers already supplied in the invocation or conversation instead of re-asking a resolved question. In particular, an explicit coverage-report-only request selects that Phase 1 path when the generated strategy exists.

The output is the target repo's `.claude/skills/test-strategy/SKILL.md`, built from `<base>/references/test-strategy-template.md` (`<base>` is the `Base directory for this skill:` path printed when this skill loaded). Read the template before Phase 5 and reproduce its structure exactly.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — the exact option labels, `multiSelect` settings, and list-vs-picker thresholds all still apply and get exercised on every run — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard stop:** the only site autopilot never resolves is Phase 0's "target repo not identifiable" — which repo to onboard is never inferred. Autopilot also never commits, and never deletes a placeholder file; it only lists them.

**Decision log:** write `make-it-work/define-test-strategy-autopilot-log.jsonl` under the current directory at invocation — the invocation root recorded in Phase 0, never the target repo — overwritten fresh at the start of each autopilot run (it describes that run only). Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses the `askUserQuestion` and `checkpoint` `kind` values, `multiSelect` is a genuine boolean (Phase 2's location confirmation is a real `multiSelect: true` site), so `chosen` can be a string, an array of strings, or `null`. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 0"`, `"Phase 4"`. `site` examples: `"go-deep-offer"`, `"location-confirm"`, `"tag-and-migration-confirm"`.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for this log, invoking each writer command in its own Bash tool call; preserve this skill's timing and never use it to bypass a denied log write.

If writing this log file is denied by the current environment (e.g. a sandboxed run with no permission to write the log), note that fact plainly in the end-of-run summary below and continue the rest of the run regardless — never relocate the log to a path elsewhere, and never let a denied log write abort or stall the phases that follow.

Pass `--root "<invocation root>"` to every writer command, even after Phase 0 has changed into the target repo.

**Resolution table** (one row per interactive site, in the order they appear):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 0 | Target repo not identifiable | `checkpoint` | Hard stop. Stop and require a human; no resolution to log. |
| Phase 0 | go-deep offer | `askUserQuestion` | `"Continue without it"` — a partial run. Autopilot never runs go-deep inline. |
| Phase 1 | Prior-output menu | `askUserQuestion` | `"Refresh / migrate (Recommended)"` — refresh, plus migrate when old outputs exist. |
| Phase 2 | Location confirmation (`askUserQuestion` with `multiSelect: true` for 1-4 candidates; plain-text `checkpoint` for more than 4) | `askUserQuestion` / `checkpoint` | Auto-confirm the detected list, selecting every candidate. |
| Phase 3a | Existing-suite strategy review (`strategy-review`) | `askUserQuestion` | `"Review strategy (Recommended)"` when concrete gaps or changed constraints justify a review; preserve established tools and explicit choices. |
| Phase 3a | Strategy question (`strategy-question-<n>`) | `askUserQuestion` | Choose the repo-specific recommended option within known constraints. Record unverified environment or team assumptions in the rationale and deliverable; never infer access or user agreement. |
| Phase 3a | Strategy confirmation (`strategy-confirm`) | `checkpoint` | Confirm the resulting recommendation, retaining explicit user/project decisions and labeling defaults and assumptions. This approves documentation only. |
| Phase 4 | Tag-and-migration confirmation | `checkpoint` | Auto-confirm. Log each file and tag written, and each migration change; placeholder files are listed only. |
| Phase 5 | Refresh conflict | `checkpoint` | Keep the user's content and log the conflict. |
| Phase 6 | `CLAUDE.md` has no `## Skills Reference` | `checkpoint` | Skip the row and report it in the summary. |

The Phase 0 go-deep offer, Phase 1 prior-output menu, and Phase 3a strategy questions carry a `(Recommended)` label. Phase 3a uses repo-specific option labels except for its fixed review menu. At the go-deep offer, autopilot deliberately takes the non-recommended `"Continue without it"`, since running go-deep unattended is out of scope. Do not add a `(Recommended)` label to other sites.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision — including any site that stopped rather than resolving, and whether the decision log itself was written successfully — and the log file's path, so someone can audit the run afterward.

**How to write files:** in every phase, create and change files only with the Write and Edit tools, never with shell redirection, heredocs, `tee`, `cp` or `mv`. Delete a file only after its replacement was written that way. The decision-log writer in `docs/autopilot-log-schema.md` is the one exception.

## Phase 0 — Target Repo and Prerequisite

### Resolve the target repo

Run `pwd` and record it as the **invocation root** before changing directory. Then resolve the one repo this run onboards:

1. **`[repo]` given** → the named directory under the invocation root, or under the detected workspace root (a directory holding a workspace-root orientation file such as a top-level `CLAUDE.md` or service map). It must contain `.git`; if it doesn't exist or isn't a repo, stop and name the path.
2. **No argument, inside a repo** → the git toplevel of the invocation root (`git rev-parse --show-toplevel`).
3. **No argument, at a root with no `.git` whose subdirectories have one** → list those repos and ask the user which one to onboard. (autopilot: hard stop)
4. **None of these resolves** → stop and tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." Do not proceed. (autopilot: hard stop)

Record the **Repo ID**: the basename of the target repo's git toplevel. It goes into the skill's `## Repo ID` and qualifies every tag.

### go-deep prerequisite

Check whether `go-deep` has already run in the target repo. Any one of these signals is enough:
- `.claude/skills/` contains a `uc-*` or `domain-*` directory
- `CLAUDE.md` contains go-deep markers (Skill Loading Gate, Skills Reference, or After Any Feature Change sections)
- `.claude/rules/architecture.md` or `.claude/rules/product.md` exists

If none is found, warn the user that the use-case and domain inventory for `<Repo ID>` is missing, then ask with one `AskUserQuestion` call (`multiSelect: false`) (autopilot: see Autopilot Mode):
- `{ label: "Run go-deep now (Recommended)", description: "Run go-deep for this repo first, then continue with its use cases and domains." }`
- `{ label: "Continue without it", description: "Write locations, layers, commands and prerequisites now; tagging stays pending go-deep." }`

Per the answer:
- **Run go-deep now** → read `<base>/../go-deep/SKILL.md` with the Read tool — never start it through the Skill tool — change into the target repo root, and follow it inline there. If the file is missing, stop and name the exact path. When it finishes, re-check the signals above; if they are still missing, set the **partial** flag. Then continue.
- **Continue without it** → set the **partial** flag and continue.

A partial run still writes the skill's locations, layers, commands and run prerequisites, and marks tagging as pending go-deep (Phases 4-5).

## Phase 1 — Prior-Output Detection

In the target repo, detect two things so this run never silently overwrites or ignores earlier output:

- **Refresh mode:** `.claude/skills/test-strategy/SKILL.md` already exists.
- **Migration set** — outputs of the old version of this skill:
  - `.claude/rules/testing-strategy.md`;
  - **path-tagged files:** separate test files whose path carries an old path tag (`uc-<id>` / `domain-<name>` in a file or directory name), that have no `@covers` line, and whose first line does not carry the placeholder marker below; implementation files with embedded tests are exempt from conversion;
  - **placeholder files:** files whose first line contains `baseline placeholder scaffolded by define-test-strategy` (case-insensitive). These are listed only — never converted, tagged, or deleted by this skill;
  - a `CLAUDE.md` Rules Files row naming that old rule file;
  - a `CLAUDE.md` "After Any Feature Change" checklist item about checking regression status before commit.

Tell the user what was found: whether the new skill exists, and each migration-set item with its path.

- **Nothing found** → **fresh** mode. Proceed to Phase 2 with no menu.
- **Anything found** → ask before writing anything, with one `AskUserQuestion` call (`multiSelect: false`) (autopilot: see Autopilot Mode):
  - `{ label: "Refresh / migrate (Recommended)", description: "Re-detect locations, commands and prerequisites, keep user edits, propose new tags, and migrate any old outputs found." }`
  - If the new skill exists: `{ label: "Coverage report only", description: "Write nothing; report explicit, inferred and unresolved test mappings and coverage gaps live." }`
  - Otherwise: `{ label: "Stop — change nothing", description: "End the run without writing anything." }`

Per the answer:
- **Refresh / migrate** → proceed to Phase 2 in **refresh** mode when the new skill exists, otherwise **fresh** mode, carrying the migration set forward when it is non-empty.
- **Coverage report only** → skip to Phase 7. Write nothing.
- **Stop — change nothing** → end the run. Write nothing.

## Phase 2 — Test Locations

Find every place this repo's tests live. Candidates:
- the target repo itself, if it has test files or test tooling;
- sibling repos under the target repo's parent, plus repos named in a workspace-root orientation file, whose **test files** reference the target repo;
- repos that the target repo's CI config checks out or triggers.

A sibling test file references the target repo when it contains any of:
- an import or require path into it;
- its package or module name (from its manifest);
- one of its API base paths (from its route definitions);
- its Repo ID. Skip this signal when the Repo ID is shorter than 5 characters.

Search with `grep -rlI --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude --exclude-dir=make-it-work`, restricted to files that look like tests: the path contains `test` or `spec`, or the file matches the sibling's test runner config.

Also inspect configured source roots for embedded tests and executable documentation examples using the language's actual test declarations and runner discovery. The path need not contain `test`/`spec`. Include sibling locations when these tests exercise the target repo by the same reference signals above. Distinguish embedded tests from separate test files even when a separate file lives under `src/`; neither placement nor filename determines its layer.

The target repo is always in the list, and always row 1 of `## Test Locations`. Use the template's literal `none` row only when it has neither test files nor configured test tooling. Configured tooling requires repo evidence: an actual test script, runner configuration, CI test command, or real tests using the runner. A runtime shipping a built-in runner is not configuration; neither is a stale README/`CLAUDE.md` reference to a nonexistent script, an empty directory or a placeholder script. For example, Node plus `scripts: {}` and no tests means `none`, even though `node --test` is available; an existing `test: node --test` script is configured tooling even with no tests. When tooling exists but tests do not, record the configured layers, file pattern and command; do not invent an existing test file for an example command. The target repo cannot be removed.

Confirm the list with the user before anything is written; they may remove or add locations (autopilot: see Autopilot Mode):
- **1 candidate** → one `AskUserQuestion` call (`multiSelect: true`) with that location plus `{ label: "Add another location", description: "Name a test location this search missed." }`, since a question needs two options.
- **2-4 candidates** → one `AskUserQuestion` call (`multiSelect: true`), one option per location. The user adds a missing location through "Other".
- **More than 4** → a plain-text list; the user confirms it as-is or edits it in reply.

In autopilot, `chosen` is every candidate location's label, never `Add another location`.

For each confirmed location in another repo, check that repo for the Phase 0 go-deep signals, including a repo that only holds tests (e.g. a QA repo). If none is found, print exactly: "go-deep has not been run in `<repo>`; run it there for better domain context". Repeat it in the end summary, and continue.

## Phase 3 — Per-Location Analysis

For each confirmed location, collect what each template section needs. Phase 5 writes it.

- **`## Layers`** — identify configured layers from actual dependencies/config (testing libraries in `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, CI config, or equivalent). Phase 3a also adds every selected planned/deferred layer, with Status per the template. State what each layer is for and not for, and its prerequisites; an unselected recommendation does not become a layer row.
- **`## Test Locations` command** — the full-suite command, plus one example command per layer for `## Layers`. Discover them from `package.json` scripts, `Makefile` targets, CI config (e.g. `.github/workflows/`), or `CLAUDE.md`'s Quick Reference — never assume `npm test` or `pytest`. If none is found, write `none` and say so in the summary.
- **`Test files` globs** — from configured separate-file match patterns plus source roots with actual embedded tests/examples. Record embedded declaration discovery and supported selectors under How to Scan, not just a broad source glob; placement is independent of layer.
- **`## Run Prerequisites`** — env vars, services with a check command, credentials, and how to start them, from env usage in test config, `docker-compose` files, CI `services:`/`env:`, and README test sections. `Local run:` is `ci-only` when a suite runs only in CI; use `slow` or `flaky` only when config or docs say so; otherwise `yes`.
- **`## Where New Tests Go`** — existing destinations/naming plus every selected planned/deferred layer's intended destination, carrying the same Status as Layers. Proposed directories need not exist; unresolved destinations are `TBD`, never an omitted layer.
- **`## Coverage Decision Guidance`** — a short list mapping a kind of change to a configured or selected layer. For planned/deferred choices, include setup requirements or the deferral risk/revisit condition, for example:
  - pure function or isolated module → unit
  - UI component rendering or local behavior → component
  - API contract (request/response shape, endpoint signature) → contract
  - cross-service or end-to-end flow → behavior

When no usable automated test setup exists in the confirmed locations, read `<base>/references/recommend-initial-setup.md`. Add the repo-specific proposal under `## Recommended Setup`, after `## How to Scan`. Test Locations stays factual (`none` when no tests/tooling exist); selected layers and destinations still appear in Layers and Where New Tests Go as planned/deferred. Keep runnable-looking proposed commands in Recommended Setup; Example command is `none` until configured. Write plain `None` in the layer/destination/guidance sections only when no configured or selected layers exist. This skill recommends setup; installing tooling and writing the first real test belong to implementation, including `implement`'s testing-readiness step.

## Phase 3a — Discuss the Testing Strategy

Read `<base>/references/strategy-discussion.md` and follow it after discovery, before tagging or writing the strategy.

- **No real tests in the confirmed locations** (no non-skipped behavior tests, including configured tooling with an empty or placeholder-only suite) → conduct the discussion as part of normal onboarding; no opt-in menu.
- **Existing real tests** → when the user requests strategy advice, conduct the discussion. Otherwise, if discovery finds concrete gaps or changed constraints, offer one `AskUserQuestion` (`multiSelect: false`, site `strategy-review`): `Review strategy (Recommended)` / `Keep current approach`. Describe the actual gap and the cost/benefit of reviewing it. If there is no reason to revisit the approach, or the user keeps it, retain prior decisions and continue without an interview.
- **Coverage report only** → Phase 1 goes directly to Phase 7; never start this discussion.

Present a repo-specific recommendation that distinguishes current coverage, recommended target coverage and a feasible first adoption phase. Assess layers from risks rather than limiting the target to existing tooling; discuss missing prerequisites and consequential scope choices before prioritizing individual tests. Keep proposed production refactoring separate from test setup and do not default to testing duplicated logic. Then ask one material question at a time (`multiSelect: false`, sites `strategy-question-1`, `strategy-question-2`, etc.). Use 2–3 meaningful options with the recommended option first, explanations of tradeoffs, and free-text input. Do not ask for facts already established by code, docs, earlier answers or the caller. Close with a plain-text `strategy-confirm` checkpoint showing the target, first phase, remaining risks and prerequisites for confirmation or correction. Autopilot resolves these sites per its table without waiting.

Save the result under `## Strategy Decisions` after `## How to Scan`, before `## Recommended Setup` when present. Include rationale, decision sources, assumptions, first tests, deferred work and adoption order per the reference. Project the selected choices into Layers, Where New Tests Go and Coverage Decision Guidance with explicit Status; they must not appear only in narrative or setup recommendations. Keep concrete setup proposals in Recommended Setup, including justified additions to an existing suite, and keep Test Locations limited to actual configuration. Agreement on a strategy does not install tooling, add tests, change CI, or select `implement`'s automated/manual verification policy.

## Phase 4 — Tag Mapping, Migration Confirmation, Tagging

1. **Vocabulary.** Take it from the target repo's go-deep inventory: the `uc-*` and `domain-*` directories under `.claude/skills/`. Fall back to the `.claude/rules/product.md` use-case table and the `.claude/rules/architecture.md` domains. In partial mode there is no vocabulary: discover tests and supported selectors, but skip UC/domain relationship inference, tagging and path-tag conversion; still run the migration items in step 3 that don't need tokens.
2. **Map tests by placement.** In every confirmed location, discover separate test files and embedded tests (per `Test files` and the template's How to Scan).
   - Skip placeholder files.
   - In separate test files, keep existing `@covers` lines for this Repo ID; never touch tokens for other repos. In refresh mode, propose tags only for untagged tests.
   - For untagged separate tests that exercise the target repo, infer UC and domain tokens from the test name, the code imported or called, and the endpoints hit. An old path tag is a strong signal.
   - Never add or maintain tags in implementation files, including executable documentation examples. Leave legacy embedded tags untouched; they do not establish explicit coverage. Infer each embedded test's relationship through its containing module and the behavior actually asserted, backed by UC/domain documentation or traced code. Record its identity, evidence, and supported runner selector or selection limitation. Do not assign every UC using a module to all its embedded tests. Missing or ambiguous evidence is unresolved, not covered or automatically uncovered.
   - Mark separate files with no single-line comment form as untaggable; embedded tests are exempt, not untaggable.
3. **One checkpoint**, in plain text; the user confirms or edits it (autopilot: see Autopilot Mode). Show:
   - the proposed mapping per location: file → test or suite → tokens, distinguishing explicit tags for separate files from inferred embedded relationships with evidence;
   - unmappable and untaggable tests;
   - the migration changes, when Phase 1 found any:
     - path tags converted to `@covers` (in partial mode, listed as pending go-deep instead);
     - `.claude/rules/testing-strategy.md` deleted once Phase 5 has carried its content into the new skill;
     - the `CLAUDE.md` Rules Files row and "check regression status before commit" checklist item removed (Phase 6);
     - placeholder files, listed for the user to delete.
4. **After confirmation:**
   - In separate test files only, write each `@covers` line directly above its test or suite, as a single-line comment in the file's own comment syntax, in the form `@covers <Repo ID>:UC-<id> <Repo ID>:domain-<name>` (template `## Tag Convention`). In PHP, put the `//` line above any docblock, never inside it. Embedded tests require no source edits for mapping.
   - Leave all changes uncommitted.
   - Never commit, rename or move a test file.

## Phase 5 — Write the Skill

Write `.claude/skills/test-strategy/SKILL.md` in the target repo from the template, using what Phases 2-4 collected.

- **Fresh** → write the file from the template, frontmatter included.
- **Strategy discussion** → include `## Strategy Decisions` per Phase 3a when conducted, or preserve an existing section when no new discussion is needed. Record explicit changes agreed in this discussion with their rationale; they need no second approval under the refresh-conflict rule. Defaults cannot supersede explicit user/project choices.
- **Selected-layer consistency** → before saving, check every selected layer in current or saved Strategy Decisions has a Layers row, a matching-status Where New Tests Go row (or explicit `TBD` destination), and appropriate Coverage Decision Guidance. `planned`/`deferred` rows have Example command `none`; no unconfigured layer or command is promoted into Test Locations. For example, user-selected unit plus component coverage with only unit tooling means Unit configured and Component planned in both tables, with component behavior mapped to Component (setup required).
- **Setup recommendations** → include `## Recommended Setup` for absent tooling per Phase 3, or concrete missing capabilities selected in Phase 3a. On refresh, preserve user edits to a prior proposal under the same conflict rule. Once a setup is configured, identify which recommendations are fulfilled and retain any user-written future recommendations as notes; never activate an unconfigured layer.
- **Refresh** → read the existing file in full first.
  - **Schema upgrade:** add Status/prerequisites and project already-recorded explicit selections into the tables, replacing old generated configured-only boilerplate. Upgrade generated tag-only guidance to the template's separate/embedded discovery rule, with actual embedded discovery/selectors under How to Scan and placement in Where New Tests Go; write None when no embedded tests exist. This is documentation of existing decisions, not a new strategy choice or permission to install tooling; do not require the user to reselect the same layers. Preserve unrelated user content. If user-written policy or a saved decision conflicts, use the normal conflict rule rather than inventing a selection. Never strip existing embedded tags during this upgrade.
  - Keep user-written content under every heading, and every heading after `## How to Scan` other than `## Pending`.
  - Fill gaps: add newly detected locations, layers, prerequisites and targets. Update detected facts the file states differently only after the conflict rule below.
  - **Verified setup by implement:** when the caller supplies its selected automated policy, saved pre-setup strategy, exact setup changes and a successful real-test command/result, replace the corresponding old `none`/no-tooling facts with that verified configuration and promote only the verified planned layer/destination rows to `configured`. This includes locations, layers, commands, prerequisites, destinations and decision guidance; identify fulfilled recommendations as configured while retaining unrelated planned/deferred selections. These are facts deliberately changed by the authorized setup, not unresolved refresh conflicts. Preserve unrelated user content and constraints; this exception cannot override a user's testing policy or activate unverified tooling. Without that supplied evidence, the normal conflict rule still applies.
  - **Conflict:** when existing content contradicts a new finding, quote both versions, name the heading, and ask which to keep (autopilot: see Autopilot Mode). Never resolve one silently.
- **Migration** (the old rule file is in the migration set) → read `.claude/rules/testing-strategy.md` and carry its content into the new skill by meaning, not by heading text. Treat it as user-written content, under the same conflict rule:

  | Old section | Goes to |
  | --- | --- |
  | `## Commands` | `## Test Locations` full-suite command; `## Layers` example commands |
  | `## Test Layers` | `## Layers` |
  | `## Coverage Decision Tree` | `## Coverage Decision Guidance` |
  | Old tag convention | Dropped — `## Tag Convention` replaces it |
  | Anything that doesn't fit | A user heading `## Notes (migrated)`, after `## How to Scan` (after `## Pending` when present); update an existing one in place |

  Write the new skill first. Only after that write succeeds, delete `.claude/rules/testing-strategy.md`. If the write fails, keep the old file and say so in the summary.
- **Partial** → write `## Pending` stating that UC/domain mapping awaits go-deep. Retain the template's `## Tag Convention` and both discovery paths under `## How to Scan`, filling in `<Repo ID>` and actual embedded discovery/selectors (or None when absent). Do not infer token relationships without vocabulary. A run that is not partial removes any `## Pending` left by an earlier partial run.
- **Write blocked** → if writing `.claude/skills/test-strategy/SKILL.md` is denied or fails (e.g. the environment protects `.claude/`), never write it anywhere else. Print the full generated file in chat, verbatim from its front matter to its last line, in one fenced block, so the user can save it once writes there are allowed. Never replace it with a summary or a list of its sections. When only your final message is shown (a non-interactive run), put that block in the final message, before the summary. Keep the old rule file, skip Phase 6, and continue with Phase 7.

## Phase 6 — CLAUDE.md Pointer and Migration Clean-Up

Edit only the target repo's `CLAUDE.md`. Run this phase only when Phase 5 wrote the skill: otherwise the pointer would name a missing skill, and the clean-up would orphan a rule file that is still in place.

1. **Pointer.** In `## Skills Reference`, ensure an `### Other Skills` table (`Skill | Topic | Load when...`) exists, placed after the section's existing tables, holding exactly one `/test-strategy` row:
   `| /test-strategy | Test locations (incl. other repos), commands, prerequisites, new-test targets, @covers tags | Planning, writing, running, or reviewing tests |`
   Add the row if missing, replace it if it differs, and drop duplicates. Leave other rows in the table alone.
   If `CLAUDE.md` or its `## Skills Reference` is missing, add nothing, never invent the section, and report it in the summary (autopilot: see Autopilot Mode).
2. **Migration clean-up**, only for items Phase 1 found:
   - Remove the Rules Files row naming `.claude/rules/testing-strategy.md`.
   - Remove the "After Any Feature Change" checklist item about checking regression status before commit, then renumber the remaining items consecutively from `1`, keeping their order and wording.
   - Remove nothing else.

Never write or offer a git hook, and never add a checklist item.

## Phase 7 — Live Coverage Report

A chat-only report: write nothing to disk. On the Phase 1 "Coverage report only" path, read the locations from the existing skill's `## Test Locations`, and the vocabulary per Phase 4 step 1.

Scan with the Repo ID under the existing skill's `## Repo ID` (on a fresh run it equals Phase 0's). If it differs from the basename Phase 0 recorded, warn that tags use the recorded ID and the repo should be cloned as `<Repo ID>`, then continue.

1. **Scan.** For every vocabulary token, follow both parts of `## How to Scan` once per location, fresh — never reuse an earlier result. For an older tag-only strategy, supplement the scan with read-only embedded-test discovery and module/behavior evidence per the current template; do not rewrite the strategy on a coverage-only run. A token is mapped when a separate test explicitly tags it or an embedded test has a supported inferred relationship. Missing paths or incomplete discovery are not scanned/unresolved, not proof of no coverage.
2. **Report**, keeping mapping kinds and gap lists separate:
   - **Explicit mappings** and **Inferred mappings** — list tokens separately; inferred entries name the embedded test and module/behavior evidence. A token can occur in both lists.
   - **Unresolved mappings** — candidate tests/tokens with missing or ambiguous evidence, plus locations not scanned. Report outstanding candidates even when the token also has a confirmed mapping.
   - **Uncovered use cases** — every `<Repo ID>:UC-<id>` with neither explicit nor inferred matches after a complete scan and no unresolved candidate.
   - **Uncovered domains** — the same rule for `<Repo ID>:domain-<name>`.
   - A mapped count for each (deduplicate tokens across explicit and inferred lists), with unresolved counts separate. These are test relationships, not proof of adequate behavioral coverage or passing results.
   - Write `None` for a list with no gaps. When a list's source is missing (no `uc-*`/`domain-*` directories and no fallback table), write "source missing" for that list instead — never `None`.
   - In partial mode, print "Coverage pending go-deep" instead of both lists.
3. End the report with: "Re-run `/make-it-work:define-test-strategy` and choose 'Coverage report only' any time for a fresh view."

## End-of-Run Summary

After the coverage report, print a summary of the run (on the "Coverage report only" path, state that nothing was written):

- the skill path written — or, when the write was blocked, that path, its full content in one fenced block (in this message if it was not printed earlier in it), that the old rule file and `CLAUDE.md` were left unchanged, and to re-run after allowing writes there;
- the confirmed locations, each with its repo;
- go-deep warnings: the Phase 2 sentence, repeated per repo, and, in partial mode, that tagging is pending go-deep for `<Repo ID>`;
- full-suite commands written as `none`;
- when tooling is absent, the recommended initial setup, why it fits this repo, and that it is proposed rather than configured;
- when strategy was discussed, the selected layers and approach, first coverage priorities, deferred work, and any assumptions or defaults still needing validation; report proposed additions to existing suites as proposed too;
- the tag edits per repo, uncommitted, for the user to review and commit;
- untaggable files;
- migration removals: path tags converted, the old rule file deleted (or kept, and why), and the `CLAUDE.md` row and checklist item removed;
- placeholder files left for the user to delete;
- the `CLAUDE.md` change: the `/test-strategy` row added, updated, or already present — or no `## Skills Reference` found;
- under autopilot, the log path, whether the log was written, and every auto-resolved site, per Autopilot Mode.

## When run by implement

**Live autonomy** — the caller supplies the workflow state path. Follow [implement's chat autonomy contract](../implement/references/autonomy-changes.md) in this inline session, using the current saved mode before each question/default instead of the entry flag after a change. Preserve strategy decisions and verified setup; changing mode does not select manual verification. The Autonomous Phase 3a exception below still applies.

`implement` may follow this skill inline during testing readiness to inventory or refresh an affected repo. It passes the target repo, invocation/artifact root, and autonomy, plus the ticket scope and prior strategy decisions when available. Scope Phase 3a to changed behavior and nearby regression risks; reuse its saved proposal/decisions and do not reopen resolved questions on the post-setup refresh. Guided mode asks only unresolved material strategy questions. Autonomous mode resolves Phase 3a without waiting using the same evidence-based defaults as Autopilot, labeled as autonomous defaults; it does not create a DTS autopilot log. Under Autopilot apply this skill's full `--autopilot` policy, including its own decision log; outside Phase 3a, other modes retain the normal questions. After verified setup the caller also passes the selected automated policy, saved pre-setup strategy, exact setup changes and actual successful test result for Phase 5's narrow activation rule. Do not run go-deep inline in this context: its absence means a partial run. Return the generated skill path, active commands or `none`, strategy decisions, recommended setup if needed, and files changed. `implement` owns setup decisions and tooling changes, including its separate automated/manual verification choice, and refreshes this skill after setup succeeds. This inventory has no stage handoff of its own.
