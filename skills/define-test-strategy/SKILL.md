---
name: define-test-strategy
description: "Onboarding step run after go-deep, once per repo: builds that repo's test-strategy skill (`.claude/skills/test-strategy/SKILL.md`) — where its tests live across repos, how to run them, what they need, where new tests go — tags existing tests with repo-qualified `@covers` comments, migrates the old rules-file version, and reports live coverage. Use when onboarding a repo's tests or refreshing its test strategy."
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
| Phase 4 | Tag-and-migration confirmation | `checkpoint` | Auto-confirm. Log each file and tag written, and each migration change; placeholder files are listed only. |
| Phase 5 | Refresh conflict | `checkpoint` | Keep the user's content and log the conflict. |
| Phase 6 | `CLAUDE.md` has no `## Skills Reference` | `checkpoint` | Skip the row and report it in the summary. |

Only the Phase 0 go-deep offer and the Phase 1 prior-output menu carry a `(Recommended)` label. At the go-deep offer, autopilot deliberately takes the non-recommended `"Continue without it"`, since running go-deep unattended is out of scope. Do not invent a `(Recommended)` label on any other site.

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
  - **path-tagged files:** test files whose path carries an old path tag (`uc-<id>` / `domain-<name>` in a file or directory name), that have no `@covers` line, and whose first line does not carry the placeholder marker below;
  - **placeholder files:** files whose first line contains `baseline placeholder scaffolded by define-test-strategy` (case-insensitive). These are listed only — never converted, tagged, or deleted by this skill;
  - a `CLAUDE.md` Rules Files row naming that old rule file;
  - a `CLAUDE.md` "After Any Feature Change" checklist item about checking regression status before commit.

Tell the user what was found: whether the new skill exists, and each migration-set item with its path.

- **Nothing found** → **fresh** mode. Proceed to Phase 2 with no menu.
- **Anything found** → ask before writing anything, with one `AskUserQuestion` call (`multiSelect: false`) (autopilot: see Autopilot Mode):
  - `{ label: "Refresh / migrate (Recommended)", description: "Re-detect locations, commands and prerequisites, keep user edits, propose new tags, and migrate any old outputs found." }`
  - If the new skill exists: `{ label: "Coverage report only", description: "Write nothing; report uncovered use cases and domains from a live tag scan." }`
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

The target repo is always in the list, and always row 1 of `## Test Locations` — the template's literal `none` row when it holds no tests. It cannot be removed.

Confirm the list with the user before anything is written; they may remove or add locations (autopilot: see Autopilot Mode):
- **1 candidate** → one `AskUserQuestion` call (`multiSelect: true`) with that location plus `{ label: "Add another location", description: "Name a test location this search missed." }`, since a question needs two options.
- **2-4 candidates** → one `AskUserQuestion` call (`multiSelect: true`), one option per location. The user adds a missing location through "Other".
- **More than 4** → a plain-text list; the user confirms it as-is or edits it in reply.

In autopilot, `chosen` is every candidate location's label, never `Add another location`.

For each confirmed location in another repo, check that repo for the Phase 0 go-deep signals. If none is found, print exactly: "go-deep has not been run in `<repo>`; run it there for better domain context". Repeat it in the end summary, and continue.

## Phase 3 — Per-Location Analysis

For each confirmed location, collect what each template section needs. Phase 5 writes it.

- **`## Layers`** — from the location's actual dependencies and config (testing libraries in `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, CI config, or equivalent). State what each layer is for and not for. Skip any layer with no tooling rather than listing it as aspirational.
- **`## Test Locations` command** — the full-suite command, plus one example command per layer for `## Layers`. Discover them from `package.json` scripts, `Makefile` targets, CI config (e.g. `.github/workflows/`), or `CLAUDE.md`'s Quick Reference — never assume `npm test` or `pytest`. If none is found, write `none` and say so in the summary.
- **`Test files` glob** — from the runner's configured test-match pattern, or the existing test file names.
- **`## Run Prerequisites`** — env vars, services with a check command, credentials, and how to start them, from env usage in test config, `docker-compose` files, CI `services:`/`env:`, and README test sections. `Local run:` is `ci-only` when a suite runs only in CI; use `slow` or `flaky` only when config or docs say so; otherwise `yes`.
- **`## Where New Tests Go`** — per layer, the directory existing tests of that layer live in and their file naming.
- **`## Coverage Decision Guidance`** — a short list mapping a kind of change to a layer, using only the layers found, for example:
  - pure function or isolated module → unit
  - UI component rendering or local behavior → component
  - API contract (request/response shape, endpoint signature) → contract
  - cross-service or end-to-end flow → behavior

## Phase 4 — Tag Mapping, Migration Confirmation, Tagging

1. **Vocabulary.** Take it from the target repo's go-deep inventory: the `uc-*` and `domain-*` directories under `.claude/skills/`. Fall back to the `.claude/rules/product.md` use-case table and the `.claude/rules/architecture.md` domains. In partial mode there is no vocabulary: skip tag inference and path-tag conversion, but still run the migration items in step 3 that don't need tags.
2. **Infer tags.** In every confirmed location, find the test files (per `Test files`) and the tests or suites in them.
   - Skip placeholder files.
   - Keep existing `@covers` lines for this Repo ID; never touch tokens for other repos. In refresh mode, propose tags only for untagged tests.
   - For untagged tests that exercise the target repo, infer UC and domain tokens from the test name, the code imported or called, and the endpoints hit. An old path tag is a strong signal.
   - Mark files with no single-line comment form as untaggable.
3. **One checkpoint**, in plain text; the user confirms or edits it (autopilot: see Autopilot Mode). Show:
   - the proposed mapping per location: file → test or suite → tokens;
   - unmappable and untaggable tests;
   - the migration changes, when Phase 1 found any:
     - path tags converted to `@covers` (in partial mode, listed as pending go-deep instead);
     - `.claude/rules/testing-strategy.md` deleted once Phase 5 has carried its content into the new skill;
     - the `CLAUDE.md` Rules Files row and "check regression status before commit" checklist item removed (Phase 6);
     - placeholder files, listed for the user to delete.
4. **After confirmation:**
   - Write each `@covers` line directly above its test or suite, as a single-line comment in the file's own comment syntax, in the form `@covers <Repo ID>:UC-<id> <Repo ID>:domain-<name>` (template `## Tag Convention`). In PHP, put the `//` line above any docblock, never inside it.
   - Leave all changes uncommitted.
   - Never commit, rename or move a test file.

## Phase 5 — Write the Skill

Write `.claude/skills/test-strategy/SKILL.md` in the target repo from the template, using what Phases 2-4 collected.

- **Fresh** → write the file from the template, frontmatter included.
- **Refresh** → read the existing file in full first.
  - Keep user-written content under every heading, and every heading after `## How to Scan` other than `## Pending`.
  - Fill gaps: add newly detected locations, layers, prerequisites and targets. Update detected facts the file states differently only after the conflict rule below.
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
- **Partial** → write `## Pending`, and write `## Tag Convention` and `## How to Scan` exactly as the template gives them, with only `<Repo ID>` filled in. A run that is not partial removes any `## Pending` left by an earlier partial run.
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

1. **Scan.** For every vocabulary token, run `## How to Scan` once per location, fresh — never reuse an earlier result. A token is covered when any location matches. If a location's path does not exist, name it as not scanned and continue.
2. **Report**, keeping the two lists separate:
   - **Uncovered use cases** — every `<Repo ID>:UC-<id>` with no match.
   - **Uncovered domains** — every `<Repo ID>:domain-<name>` with no match.
   - A covered count for each, e.g. "6 of 8 use cases covered".
   - Write `None` for a list with no gaps. When a list's source is missing (no `uc-*`/`domain-*` directories and no fallback table), write "source missing" for that list instead — never `None`.
   - In partial mode, print "Coverage pending go-deep" instead of both lists.
3. End the report with: "Re-run `/make-it-work:define-test-strategy` and choose 'Coverage report only' any time for a fresh view."

## End-of-Run Summary

After the coverage report, print a summary of the run (on the "Coverage report only" path, state that nothing was written):

- the skill path written — or, when the write was blocked, that path, its full content in one fenced block (in this message if it was not printed earlier in it), that the old rule file and `CLAUDE.md` were left unchanged, and to re-run after allowing writes there;
- the confirmed locations, each with its repo;
- go-deep warnings: the Phase 2 sentence, repeated per repo, and, in partial mode, that tagging is pending go-deep for `<Repo ID>`;
- full-suite commands written as `none`;
- the tag edits per repo, uncommitted, for the user to review and commit;
- untaggable files;
- migration removals: path tags converted, the old rule file deleted (or kept, and why), and the `CLAUDE.md` row and checklist item removed;
- placeholder files left for the user to delete;
- the `CLAUDE.md` change: the `/test-strategy` row added, updated, or already present — or no `## Skills Reference` found;
- under autopilot, the log path, whether the log was written, and every auto-resolved site, per Autopilot Mode.
