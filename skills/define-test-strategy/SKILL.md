---
name: define-test-strategy
description: "Bootstraps a per-project test strategy file and an initial regression baseline once per project, the same way go-deep bootstraps the knowledge base — generating a starting test-strategy doc, scaffolding placeholder tests for confirmed-uncovered critical flows, and wiring a UC/domain test-tagging convention with a re-runnable coverage-check mode. Use when a project needs its test strategy and baseline coverage established after go-deep has already run."
disable-model-invocation: true
---

# Define the Test Strategy

## Usage

```
/make-it-work:define-test-strategy [--autopilot]
```

Requires `go-deep` to have already run in the target project — if it hasn't, this skill stops and tells the user to run `go-deep` first before proceeding, regardless of `--autopilot`.

- **No argument** — interactive. Every `AskUserQuestion` and checkpoint below pauses for a human, exactly as documented.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing. Exception: the hard-stop sites named in Autopilot Mode (below) are never auto-resolved, even in autopilot mode.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — the exact option labels, `multiSelect` settings, and list-vs-picker thresholds all still apply and get exercised on every run — just don't call `AskUserQuestion` or wait at a checkpoint. Auto-resolve per the table below instead.

**Hard-stop exception:** this skill's destructive/irreversible analog is Phase 5's optional hook offer and the overwrite guard next to it. Autopilot never auto-selects `"Also scaffold a real git hook"` — the recommended option at that site is always `"No hook — CLAUDE.md instruction is enough"`, so the hook-writing path is never reached unattended. And if an existing, non-empty `.husky/pre-commit` or `.git/hooks/pre-commit` is ever found (the skill's own overwrite guard), autopilot never picks a side — if somehow reached, it stops and requires a human, the same as the sites below that guard content it must never silently overwrite or arbitrate. A second class of near-destructive site is Phase 2's adopt-mode content conflict: when a stray doc's content for a heading genuinely conflicts with what the auto-loaded file already has there, autopilot never lets either version silently win — it stops and requires a human, exactly as the interactive path's own "ask which one to keep" already demands.

**Decision log:** write `make-it-work/define-test-strategy-autopilot-log.jsonl` at repo root, overwritten fresh at the start of each autopilot run (it describes that run only). Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses all three `kind` values (`askUserQuestion`, `checkpoint`, `open_text`), `multiSelect` is a genuine boolean (this skill has real `multiSelect: true` sites), so `chosen` can be a string, an array of strings, the `open_text` free-text answer, or `null`. This is also the one skill that carries the shared schema's `repo` field, since its autopilot-resolvable decisions can repeat once per repo within a single run: present whenever more than one repo is in scope, omitted for a single-repo run. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 0"`, `"Phase 3"`. `site` examples: `"decide-how-to-proceed"`, `"scaffold-confirm-multi"`.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for this log, invoking each writer command in its own Bash tool call; preserve this skill's timing and never use it to bypass a denied log write.

If writing this log file is denied by the current environment (e.g. a sandboxed run with no permission to write the log), note that fact plainly in the end-of-run summary below and continue the rest of the run regardless — never relocate the log to a path elsewhere, and never let a denied log write abort or stall the phases that follow.

**Resolution table** (one row per interactive site, in the order they appear):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 0 | ambiguous repo pick among unrelated clones with no unifying doc | `checkpoint` | No safe default — which repo even exists isn't something to infer. Stop and require a human. |
| Phase 0 | project root cannot be identified at all | `checkpoint` | Not a product-policy choice — this is already an unconditional stop on the interactive path. Autopilot behaves identically: stop, same message, no resolution to log. |
| Phase 0 | multi-repo scope confirmation ("confirm with the user which of those repos this run covers") | `checkpoint` | Confirm the full set of repos the workspace-root orientation file names — autopilot never narrows the scope on its own. |
| Phase 1 | stray-doc search finds more than one genuine, un-adopted candidate | `open_text` | Answer with your own best inference — prefer the candidate with the most complete test-strategy content (closest match to the four fixed headings), breaking ties by most-recently-modified — prefixed `[autopilot best-guess]`. |
| Phase 1 | "Decide how to proceed" (Extend / Re-check / Adopt / Generate fresh, whichever subset applies) | `askUserQuestion` | Choose the option labeled `(Recommended)` — "Extend existing strategy file" whenever case (b) applies (alone or alongside case (c)); otherwise "Adopt stray doc into the auto-loaded location" when only case (c) applies. Never choose "Generate fresh; leave `<path>` untouched" unattended — it is never the recommended option when it's offered. |
| Phase 2 | extend/adopt mode detects existing content that contradicts this file's own stated invariants | `checkpoint` | Never resolve silently — flag the inconsistency to the user in the end-of-run summary exactly as the interactive path would, and stop for this repo rather than guessing which side is right. |
| Phase 2 | adopt mode: stray doc's content for a heading conflicts with the existing file's content for that heading | `checkpoint` | Hard-stop exception (see above) — never let either version silently win. Stop and require a human. |
| Phase 3 | no discoverable full-suite test command for this repo | `checkpoint` | Never invent a command. Take the "user does not set one up now" branch: end the run for this repo here, tell the user to set one up and re-invoke. (A multi-repo run continues with the rest of the workspace regardless.) |
| Phase 3 | scaffold confirmation, exactly 1 uncovered use case (single-choice + `"Skip for now"` filler) | `askUserQuestion` | Choose the one surfaced use case, not `"Skip for now"` — the same filler-option guard `go-deep` already resolves this way for its own single-choice-plus-filler sites. |
| Phase 3 | scaffold confirmation, 2–4 uncovered use cases (`multiSelect: true`) | `askUserQuestion` | Select every surfaced use case — scaffolding is additive (a new placeholder file per flow) and never overwrites or removes anything, so there is no reason to scaffold a strict subset unattended. |
| Phase 3 | scaffold confirmation, more than 4 uncovered use cases (plain-text list) | `checkpoint` | Auto-confirm the full list as shown, with no edits — consistent with the 2–4 case always scaffolding every surfaced flow. |
| Phase 3 | detected framework has no native skip/pending mechanism for placeholders | `checkpoint` | Never substitute a failing or silently-passing placeholder to work around this. Stop and require a human to decide how placeholders should be represented for this framework. |
| Phase 4 | end-of-run coverage report offer | `askUserQuestion` | Choose the option labeled `(Recommended)` — "Show coverage gaps now". |
| Phase 5 | `CLAUDE.md` has no "Rules Files" section, or it doesn't take the expected shape | `checkpoint` | No safe location to guess. Stop and require a human. |
| Phase 5 | `CLAUDE.md` has no "After Any Feature Change — CRITICAL" section, or it doesn't take the expected shape | `checkpoint` | No safe location to guess. Stop and require a human. |
| Phase 5 | optional hook offer | `askUserQuestion` | Choose the option labeled `(Recommended)` — "No hook — CLAUDE.md instruction is enough". Hard-stop exception (see above): never choose "Also scaffold a real git hook" unattended. |
| Phase 5 | existing, non-empty hook file found at the point a hook would be written | `checkpoint` | Unreachable under the rule above; if somehow reached, stop and require a human rather than overwriting. |

Only the Phase 1 "Decide how to proceed", Phase 4 coverage-report offer, and Phase 5 hook-offer sites carry a `(Recommended)` label in this skill's current text. Do not invent a `(Recommended)` label on any other site, and do not invent a `Skip`-last filler option where the interactive text doesn't already have one.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision — including any site that stopped rather than resolving, and whether the decision log itself was written successfully — and the log file's path, so someone can audit the run afterward.

## Phase 0 — Prerequisite Gate

### Workspace detection

Resolve the layout scope first, so the prerequisite check below applies to the actual repo boundary rather than always to the invocation directory.

Run `pwd`, then decide whether this run targets a single repo or a multi-repo workspace, using the same decision rule `plan-the-work` uses:

1. **`.git` exists here.** This directory is a repo root. Then:
   - If the **parent** directory holds a workspace-root orientation file (a top-level `CLAUDE.md` or service map describing this repo as one service among siblings) → this is one service inside a multi-repo workspace; the workspace root is the parent.
   - Otherwise → **single-repo project**; the repo root is here — even if the parent happens to contain other, unrelated repos.
2. **No `.git` here, but subdirectories have their own `.git`.**
   - If a workspace-root orientation file ties them together → **multi-repo workspace**, root is here.
   - If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to run this skill for, rather than guessing. A bare folder of unrelated clones is not a workspace. (autopilot: see Autopilot Mode)
3. **Neither of these resolves** → stop and tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." Do not proceed. (autopilot: see Autopilot Mode)

When unsure between single-repo and multi-repo, prefer single-repo.

If a multi-repo workspace is detected, list every repo the orientation file names, confirm with the user which of those repos this run covers, and treat that confirmed set as the affected repos for the rest of this skill — each gets its own test-strategy file, generated separately per repo in Phase 2. In a single-repo project, "each affected repo" simply means the one repo. (autopilot: see Autopilot Mode)

### Prerequisite check

For each repo in scope — the one repo, if single-repo; each confirmed affected repo, if a workspace — independently check whether `go-deep` has already been run there. Any one of these signals, found in that repo, is enough:
- `.claude/skills/` contains a `uc-*` or `domain-*` directory
- `CLAUDE.md` contains go-deep markers (Skill Loading Gate, Skills Reference, or After Any Feature Change sections)
- `.claude/rules/architecture.md` or `.claude/rules/product.md` exists

If a repo has none of these signals, stop for that repo. Tell the user: "`go-deep` has not been run in this project yet. Run `/make-it-work:go-deep` first, then re-invoke this skill." — naming the specific repo when more than one is in scope. Do not proceed to any other phase in this file for that repo until `go-deep` has been run there.

Only once every repo in scope has passed this check does the run continue to Phase 1.

## Phase 1 — Prior-Output Detection

For each repo in scope — independently, repeating this full phase before moving any repo past it — detect what test-strategy content already exists so this run never silently overwrites or ignores it.

### Check the auto-loaded location

Check whether `.claude/rules/testing-strategy.md` already exists in this repo.

- **Not present** → no auto-loaded file yet in this repo. Continue to the stray-doc search below.
- **Present** → this repo has an existing file at the auto-loaded location, full stop — this is always case **(b)**, regardless of its shape. Check whether it contains the fixed heading set Phase 2 always writes (`## Test Layers`, `## Coverage Decision Tree`, `## Commands`, `## UC/Domain Tag Convention`): if it does, it was almost certainly generated by a prior run of this skill; if it doesn't, it's a hand-written or hand-edited file that happens to live at that path. Either way, treat it as case (b) and never fall through to fresh generation just because the shape doesn't match exactly — only the wording shown to the user differs.

### Search for a stray strategy doc

Independent of the check above, search the rest of the repo (excluding `.claude/rules/`, `node_modules/`, and other dependency/build directories) for a document that looks like a test strategy: filenames containing `test-strategy`, `testing-strategy`, `test_strategy`, `testing_strategy`, or `test-plan` (any case, hyphen or underscore) — with `.claude/docs/testing-strategy.md` as the expected common case, but not the only path searched; search broadly, don't hardcode only that one path. Before recording a match, open each candidate and confirm it actually reads as test-strategy content (test layers, coverage guidance, test commands) rather than being an unrelated file that happens to match the name pattern — discard any that don't. Also discard (don't even list) any candidate whose content begins with an `<!-- Adopted into .claude/rules/testing-strategy.md ... -->` banner (see Phase 1's Adopt outcome below) — that banner means this exact file was already carried forward by a prior Adopt run and is being kept only as the user's own reference copy, not a fresh candidate to re-adopt. If more than one genuine, un-adopted candidate remains, list all of them and ask the user in plain text which one is the real strategy doc before continuing. (autopilot: see Autopilot Mode)

- **None found (after the content check)** → no stray doc in this repo.
- **One found** → case **(c)**, naming the exact path.

### Decide how to proceed

- Neither (b) nor (c) applies → this is case **(a)**: nothing exists anywhere for this repo. Proceed straight to Phase 2 in **fresh** mode. Do not show a menu — there is nothing to protect against overwriting.
- (b) and/or (c) applies → stop and ask before writing anything. First tell the user what was found, mirroring `go-deep`'s own Phase 0 evidence line: name the auto-loaded file's presence and shape-match result, and name the stray path if one was found. Then use a single `AskUserQuestion` call (`multiSelect: false`) with only the options that actually apply to this repo (autopilot: see Autopilot Mode):
  - If (b) applies: `{ label: "Extend existing strategy file (Recommended)", description: "Keep .claude/rules/testing-strategy.md and add to it rather than regenerating it." }`
  - If (b) applies: also always include `{ label: "Re-check coverage only", description: "Skip generation entirely — scan existing tests for UC/domain tags and report gaps using the current tag convention." }` — this is case **(d)**. Offer this only when the auto-loaded file already exists; a stray doc alone has no tag convention yet to re-check against.
  - If (c) applies: `{ label: "Adopt stray doc into the auto-loaded location", description: "Copy <path found>'s content into .claude/rules/testing-strategy.md and extend it there — the original file is left in place, marked as superseded." }` — append `(Recommended)` to this label only when (b) does **not** also apply (the case-(c)-alone menu below); when (b) also applies, "Extend" above already carries `(Recommended)` and only one option per question should — never mark both Adopt and Extend recommended in the same call.
  - If (c) applies and (b) does not: also include `{ label: "Generate fresh; leave <path found> untouched", description: "Write a new .claude/rules/testing-strategy.md from scratch and don't touch the existing document." }`, so the menu always has at least two options and declining adoption is an explicit choice, never a silent fallback. In this case-(c)-alone menu, Adopt (per above) is the recommended option, not Generate fresh.
  - If both (b) and (c) apply, present Extend, Re-check, and Adopt together in this one call rather than asking twice.

Wait for the user's answer before proceeding. Then, per the option chosen:
- **Extend** (b) → proceed to Phase 2 for this repo in **extend** mode: read the existing `.claude/rules/testing-strategy.md` in full first, then add to/update it in place, preserving the user's own content and only filling gaps against the fixed heading set.
- **Adopt** (c) → tell the user explicitly that the stray file's content is being copied into `.claude/rules/testing-strategy.md` (name both paths). Proceed to Phase 2 for this repo in **adopt** mode, carrying the stray doc's full content forward as the starting input (merged against the fixed heading set the same way extend mode merges). Leave the original stray file in place — do not delete it — but prepend a one-line banner to its top: `<!-- Adopted into .claude/rules/testing-strategy.md on <today's date> — this file is superseded and kept only for reference; the auto-loaded copy is authoritative. -->`. This banner is what lets the stray-doc search above recognize this file as already-adopted on any future run, instead of re-offering it as a fresh candidate every time. Tell the user the original is now superseded; they can remove it themselves once satisfied.
- **Re-check coverage** (d) → skip Phase 2 and Phase 3 entirely for this repo. Go directly to Phase 4 (coverage-check mode) using the tag convention already documented in the current `.claude/rules/testing-strategy.md`. Do not touch the strategy file and do not write any new test file.
- **Generate fresh** (declining adoption) → proceed to Phase 2 for this repo in **fresh** mode, exactly as case (a), leaving the stray file untouched.

Repeat this detection independently for every repo in scope before moving any repo past Phase 1.

## Phase 2 — Generate the Strategy File

For each repo in scope, produce `.claude/rules/testing-strategy.md` according to the mode Phase 1 determined for that repo — this phase never re-decides the mode, it only executes it:

- **fresh** mode → write the file from scratch.
- **extend** mode → read the existing `.claude/rules/testing-strategy.md` in full first. Under each of the four headings below, preserve the user's own additions exactly as found — a heading that already has real content (anything beyond this skill's own placeholder wording) is never blindly regenerated or overwritten. Only fill in what's missing: an absent heading, or a gap within an existing heading (e.g. a detected test layer the existing content doesn't mention yet). "Preserve" does not mean "ignore self-contradictions": if existing content directly violates one of this file's own stated invariants (e.g. a `## Coverage Decision Tree` branch naming a layer `## Test Layers` doesn't list), flag this to the user as an inconsistency to resolve rather than silently carrying it forward — a fresh run of this skill would never have produced it. (autopilot: see Autopilot Mode)
- **adopt** mode → first check whether `.claude/rules/testing-strategy.md` already exists at the target path (Phase 1's case (b) can apply at the same time as case (c) — e.g. a hand-edited strategy file already exists there from a previous run or manual edit, and a separate stray doc was also found elsewhere). If it does, read it in full first and treat its existing content exactly the way **extend** mode does: a heading that already has real content is never blindly regenerated or overwritten. Only then layer the stray doc's content on top: take the stray doc's full content (carried forward from Phase 1) and map each of its existing sections onto whichever of the four fixed headings below its content actually matches (by what it says, not by its original heading text — e.g. a stray doc's "Testing Approach" section describing test types maps onto `## Test Layers`; a "How to Run Tests" section maps onto `## Commands`), merging it into whatever gaps remain after the existing-file content above has already been preserved. Fill any of the four headings still empty from the project's actual detected stack. If the stray doc's content for a heading **conflicts** with (states something different from, not merely absent from) what the existing file already has there — this is not a "gap" and must not be silently dropped — surface the conflict to the user in plain text (quote both versions and name which heading) and ask which one to keep, rather than the existing file's version silently winning by default. (autopilot: see Autopilot Mode) Never append the stray doc's raw text wholesale under a new, uncategorized fifth heading — every piece of adopted content must land under one of the four fixed headings, summarizing or lightly reorganizing it to fit. If a genuine piece of the stray doc's content doesn't fit any of the four headings even after an honest attempt (e.g. a "Flaky Test Policy" or ownership/process note that isn't about layers, decision rules, commands, or tagging), do not force it in and do not silently drop it either: name it explicitly in the intro line's note (see below) as content that wasn't carried forward and remains in the original (superseded-but-preserved) stray file for the user to review manually — but first check whether an equivalent "not carried forward" note already exists anywhere in the current file's body (e.g. preserved from a prior Adopt run) and, if so, update that existing note in place rather than adding a second copy.

### Intro line

Immediately under the file's top-level title, in all three modes, the first line of body content must state plainly that this file is a starting point the user is expected to extend and edit, not a finished document — this is the spec's own framing (Behavior item 1), and it must appear in the generated file's own text, not only in this instruction. Use wording close to: "This is a starting point, seeded by `define-test-strategy` — extend and edit it as the project's test approach evolves; it is not a finished document." In extend/adopt mode, if the user has already customized this line, preserve their version rather than overwriting it (same "never blindly regenerate existing content" rule as above). In **adopt** mode specifically, if any piece of the stray doc's content didn't fit one of the four fixed headings (per the adopt-mode note above), add one more short line right after the intro line naming what wasn't carried forward and pointing to the original stray file (by path) as where it still lives.

### Fixed headings

Write exactly these four headings, in this exact order, verbatim — the `run-regression` skill locates each section by matching this heading text exactly, so the wording and order must never vary from run to run or repo to repo:

**`## Test Layers`**

Identify the test layers that are actually relevant to this project's detected stack — do not write a fixed universal list. Inspect the project's actual dependencies and config (testing libraries and frameworks found in `package.json`, `requirements.txt`, `Gemfile`, `go.mod`, CI config, or equivalent) to determine which layers genuinely apply: this might be unit / component / contract / behavior, or a different set entirely (e.g. a backend-only service might have unit and contract layers but no component layer; a project with a Pact or OpenAPI contract-test setup should list contract as its own layer only if that tooling is actually present). For each layer identified, state in a table or bullet list: what it's for, and what it's explicitly not for (e.g. "Unit — pure functions and isolated modules with mocked dependencies. Not for: anything that hits a real database, network call, or renders a component tree."). Skip any layer the stack has no tooling for rather than listing it as aspirational.

**`## Coverage Decision Tree`**

Write a short decision list or tree, not prose paragraphs — matching `architecture.md`'s own "tables and bullets, not prose" style. Given a kind of change, state which layer(s) to add coverage in. Cover at minimum these branches, adapted to the layers actually identified above:
- Changed a pure function / isolated module with no external dependency → unit layer
- Changed a UI component's rendering or local behavior → component layer
- Changed an API contract (request/response shape, endpoint signature) → contract layer
- Changed cross-service or end-to-end behavior (a flow spanning multiple services or the full UC path) → behavior layer
Adjust, add, or drop branches as needed to match whichever layers this project's `## Test Layers` section actually lists — never reference a layer here that wasn't identified above.

**`## Commands`**

Record the full-suite command and one example command per layer named in `## Test Layers`. State explicitly, as the first line under this heading, that this is the section the `run-regression` skill reads to find "the full suite command" — so its shape and presence matter beyond this skill's own use. Discover these commands the same way `plan-the-work` discovers build/lint/test commands: from `package.json` scripts, `Makefile` targets, CI config (e.g. `.github/workflows/`), or `CLAUDE.md`'s existing Quick Reference section — never assume `npm test` or `pytest` by default just because they're common. If a layer has no discoverable command yet (e.g. contract tests aren't wired into any script), say so explicitly rather than inventing one.

**`## UC/Domain Tag Convention`**

Document the canonical tag form verbatim, exactly as fixed by this initiative (this is a shared contract with the `run-regression` skill, not a per-project choice, and deliberately framework/language-agnostic — nothing below depends on which test framework this project uses):
- Use-case identifiers take the form `UC-{zero-padded-id}` (e.g. `UC-08`).
- Domain identifiers take the form `domain-{name}` (e.g. `domain-velocity`).
- **A test file is tagged by its own path, never by anything parsed out of its content.** A file carries a tag when the tag token appears as a substring of its path (directory name and/or filename) relative to the repo root, matched case-insensitively with `-`/`_` treated as interchangeable, and respecting the id's trailing-digit boundary (`UC-08` must never match inside `UC-081`). This works identically for every language and test framework — there is nothing inside the file to parse, and nothing framework-specific to get wrong.
- Mapping rule: a tag maps to `go-deep`'s own skill directory names by simple prefix/exact match — `UC-08` corresponds to a skill directory named `uc-08-<kebab-case-name>` (e.g. `uc-08-withdraw-money`), and `domain-velocity` corresponds exactly to a skill directory named `domain-velocity`. This keeps every tag traceable back to the go-deep skill it represents. Name every test file — scaffolded or hand-written — after the matching skill directory, so the tag is simply "born" in the filename; no separate in-content annotation is ever required or read.
- **Placeholder marker** (a distinct concept from the tag above): a scaffolded placeholder test additionally carries a marker as its file's very first line, written as a single-line comment in that file's own language, e.g. `// baseline placeholder scaffolded by define-test-strategy — pending real coverage, not a forgotten test` in a C-style language, `# baseline placeholder scaffolded by define-test-strategy — pending real coverage, not a forgotten test` in Python/Ruby/shell. This is checked by reading the file's first line as plain text — never by inspecting test-runner state — so `run-regression` (and this skill's own Phase 4) can recognize a placeholder identically regardless of framework.

## Phase 3 — Bootstrap the Regression Baseline

For each repo in scope that Phase 1 resolved to **fresh**, **extend**, or **adopt** mode, run this phase after Phase 2 has written that repo's `.claude/rules/testing-strategy.md`. Skip this phase entirely for any repo where Phase 1 resolved case **(d) Re-check coverage** — that case already goes straight to Phase 4 and never reaches here; it is the only mode that skips Phase 3.

### Candidate set: go-deep's use-case table, never invented

Read the repo's `.claude/rules/product.md` in full — specifically go-deep's Tier 2 use-case table (`ID | Use Case | Actor | Trigger | Domains`) — and treat every row as the candidate set of critical flows. This is the only source for the candidate set: never propose a flow that isn't a row in that table, and never ask the user an open-ended "what are your critical flows?" question — the entire point of requiring `go-deep` first is that this vocabulary already exists and doesn't need to be invented here.

### No test command guardrail

Before doing anything else in this phase — before even building the candidate list to show the user — check whether this repo has a discoverable full-suite test command, using the exact same discovery `## Commands` above already performs (in a multi-repo workspace, check the repo being scaffolded — one repo's discoverable command does not license scaffolding in a sibling repo that has none). Check this first, not after asking the user which flows to scaffold — there is no point walking the user through a confirmation checkpoint for a scaffold that can't happen yet.

If no full-suite command can be discovered anywhere in this repo: stop before building or showing any candidate list, and ask the user to set one up first — never invent or assume one. (autopilot: see Autopilot Mode) Then:
- **If the user sets one up in this same session and confirms** → re-run this check once they confirm, then continue with the rest of this phase below (candidate detection, checkpoint, scaffolding) in the same run. Also re-open Phase 2's `## Commands` section for this repo and record the newly-available command there — Phase 2 ran before this command existed, so its `## Commands` and (if applicable) `## Test Layers` sections need updating to reflect it now, the same way extend mode fills a gap in existing content.
- **If the user does not set one up now** (declines, or wants to do it later) → end this run for this repo here. Do not proceed to Phase 4 or Phase 5 for this repo in this invocation — the strategy file from Phase 2 still exists and is valid, but there is nothing to scaffold or wire enforcement around yet. Tell the user to re-invoke this skill for this repo once a command is in place; Phase 1 will detect the existing strategy file as case (b) and offer to extend it, picking up from here.

### Detect existing coverage per candidate

For each use case in the table, search this repo's test file **paths** (a `find`/glob over directory names and filenames — never a search through file content) for one matching that specific use case's own `UC-{id}` tag, per `## UC/Domain Tag Convention`. Do not count a `domain-{name}` tag as coverage for a use case, even when that domain appears in the use case's own Domains column: a domain-level test doesn't establish that this specific use case's flow is exercised, and domain-only coverage gaps are Phase 4's concern (which cross-references use cases and domains separately), not this phase's.

Classify each use case into exactly one of three states, not two — a tag match alone is not enough to call something "covered":
- **Uncovered** — no file path matching the `UC-{id}` tag found anywhere in this repo's test files.
- **Scaffolded only** — a matching file path was found, and that file's first line carries the marker phrase `baseline placeholder scaffolded by define-test-strategy`, matched **case-insensitively**. This is a prior run's placeholder, not real coverage — it must never be reported as "covered."
- **Covered** — a matching file path was found, and that file's first line does **not** carry the marker phrase above. Only this state is excluded from scaffolding on the strength of "thin but real" coverage.

### User confirmation checkpoint

Show the user the full use-case table from `product.md` with each row marked **covered**, **scaffolded only**, or **uncovered** (from the classification above), then propose scaffolding only the **uncovered** subset — never the scaffolded-only subset, since re-scaffolding one would either duplicate or collide with the existing placeholder file. This presents go-deep's complete use-case list as the candidate set while keeping the actual ask focused, and mirrors `go-deep`'s own Phase 3 "Confirm Scope" checkpoint discipline: show the draft list and do not proceed past it without explicit confirmation.
- If the uncovered subset has exactly 1 use case, `AskUserQuestion` cannot take a single-option call — use a single-choice question (`multiSelect: false`) with that one use case plus `{ label: "Skip for now", description: "Don't scaffold this flow yet." }`, the same filler-option guard `go-deep` already uses for this exact constraint. (autopilot: see Autopilot Mode)
- If the uncovered subset has 2 to 4 use cases, use a single `AskUserQuestion` call (`multiSelect: true`) listing each uncovered use case as an option — the user selects which of them to scaffold now. (autopilot: see Autopilot Mode)
- If the uncovered subset has more than 4, present it as a plain-text list instead (`AskUserQuestion` cannot hold that many options in one call) and ask the user to confirm it as-is or edit it in reply — removing flows they don't want scaffolded yet, or naming one marked "covered" that they know is only thinly/incorrectly tagged and want scaffolded anyway. (autopilot: see Autopilot Mode)
- **Checkpoint: user must confirm the final scaffolding list before any test file is written.** Do not write any test file until this confirmation is given, regardless of list length or how obvious the gap looks.

### Scaffolding, per confirmed flow

For each flow that survived the confirmation checkpoint, write one scaffolded test file:
- **Location**: place it following whatever test-file location convention the detected framework/project already uses — a co-located `__tests__` directory next to the code under test, a top-level `tests/` directory, or matching wherever the project's existing test files (if any) are already placed. Don't invent a new convention; match what's already there.
- **File name — this is also the tag**: name it so (a) the detected runner's configured (or, absent explicit config, its default) test-match pattern actually collects it, matching whatever pattern this repo's config or defaults require, and (b) its path carries the `UC-{id}` tag per `## UC/Domain Tag Convention`. Derive the name from the matching `go-deep` skill directory for both traceability and the tag at once (e.g. `uc-08-withdraw-money.test.ts`, `test_uc_08_withdraw_money.py`). A placeholder the runner never collects is invisible, not a visible known gap; getting this name right also satisfies the tag requirement — no separate in-content tag is ever needed.
- **Marker**: the file's very first line must be a single-line comment, written in that file's own language, carrying the exact phrase `baseline placeholder scaffolded by define-test-strategy — pending real coverage, not a forgotten test` (see `## UC/Domain Tag Convention`'s "Placeholder marker" bullet). This is what both this skill's own Phase 4 and `run-regression` use to recognize the file as a placeholder — plain text, never anything requiring test-runner state.
- **Body**: write one minimal test using the runner's own native skip/pending mechanism — whatever is idiomatic for the detected language and framework; use general knowledge of the detected stack rather than a fixed catalog — so it neither fails nor silently reports a false green when the suite runs. See "Never a failing or silently-passing placeholder" below for the invariant this must satisfy regardless of mechanism.

### Never a failing or silently-passing placeholder

Per this initiative's Decision Log ("Stub form" answer), the scaffolded placeholder must never be a failing assertion (e.g. an assertion that always evaluates false) and never a silently-passing empty assertion (an empty test body that reports green with no signal) — a human or CI run glancing at results must be able to tell this is a deliberate placeholder, not a forgotten or broken test. The runner's own native skip/pending mechanism, used the way "Scaffolding, per confirmed flow" above describes, satisfies this. If the detected framework has no such mechanism at all, stop and ask the user how they want placeholders represented rather than substituting a failing or empty test. (autopilot: see Autopilot Mode) This invariant exists purely for human/CI legibility — `run-regression`'s own placeholder recognition (see its companion spec) never depends on runtime skip/pending state, only on the file-level marker above.

## Phase 4 — Coverage-Check Mode

This phase produces a live report only — it never writes the strategy file, never writes a test file, and never writes any new file to disk. Run it independently per repo in scope.

### Entry points

This phase is reached two ways:

- **Directly from Phase 1's case (d) "Re-check coverage only"**: that path already skipped Phase 2 and Phase 3 entirely for this repo. Once this phase's report is shown for this repo, **the run ends here for this repo — do not continue to Phase 5.** Re-check-only is a read-and-report action; it must never edit `CLAUDE.md`, the strategy file, or any test file, so nothing past this phase applies to it.
- **Offered at the end of a fresh/extend/adopt run**, once Phase 3 has finished (whether it scaffolded anything or confirmed there was nothing left to scaffold) for this repo: ask the user, via a single `AskUserQuestion` (`multiSelect: false`), whether they'd like to see the coverage view now before moving on to enforcement wiring — options like `{ label: "Show coverage gaps now (Recommended)", description: "Scan the test suite and report which use cases/domains still have no mapped tests." }` and `{ label: "Skip for now", description: "Continue without a coverage view; re-run this skill later and choose 'Re-check coverage only' to get one." }`. (autopilot: see Autopilot Mode) Whichever the user picks — and after this phase's report is shown, if they picked to see it — **continue to Phase 5 for this repo.** Enforcement wiring always happens for a repo that went through fresh/extend/adopt, regardless of whether the user viewed the coverage report along the way.

### The scan

Read the canonical tag form from this repo's current `.claude/rules/testing-strategy.md`, `## UC/Domain Tag Convention` section (the same file Phase 1(d) already promises to use, and the same convention Phase 2 wrote or Phase 3 scaffolded against). If this section is missing from `testing-strategy.md` — reachable when a hand-written file was force-classified into case (b) "regardless of its shape" (Phase 1) and the user chose "Re-check coverage only" without this skill ever having run Phase 2 against it — report that fact explicitly and stop this phase for this repo, the same way the Cross-reference step below already handles a missing `product.md` or `architecture.md`. Do not guess a tag convention.

Otherwise, search this repo's test file **paths** for every tag token actually present — a `find`/glob over directory names and filenames, never a search through file content — reusing the same technique Phase 3's "Detect existing coverage per candidate" step already uses and extending it in three ways:

- Collect **every** `UC-{id}` match, not just the one candidate a caller is checking for — build the complete set of use-case tags actually found in the test-file paths. Match `UC-{id}` only when no further digit immediately follows the id (so `UC-1` never matches inside `UC-10`).
- Also collect every `domain-{name}` match the same way, building the complete set of domain tags actually found. A test file's path may legitimately carry both a `UC-{id}` token and a `domain-{name}` token — record both when both are present, and don't require one for the other.
- For every `UC-{id}` match, also check — exactly as Phase 3's "Detect existing coverage per candidate" classification already defines, including its case-insensitive match rule — whether that file's first line carries the marker phrase `baseline placeholder scaffolded by define-test-strategy`. Record each found `UC-{id}` as either **scaffolded-only** (marker present) or **real** (marker absent) — this distinction carries through to the report below; a tag found on a scaffolded-only placeholder must never be reported as the same kind of "covered" as a tag found on a real test.

The result of this step is: a set of `domain-{name}` values found in the suite, and a set of `UC-{id}` values found in the suite each labeled **real** or **scaffolded-only**. This is a fresh scan every time this phase runs — never reuse a prior run's result or Phase 3's earlier candidate-set detection, since new tests or new tags may have been added since either ran.

### Cross-reference against go-deep's full inventory

Read this repo's `.claude/rules/product.md` use-case table in full — every row, not only the rows Phase 3 previously found uncovered — because a use case can gain hand-written, untagged-by-this-skill test coverage (or lose it) at any time outside this skill's own scaffolding, and a use case a prior Phase 3 run scaffolded a placeholder for is not automatically exempt from this check either. For every row, derive its expected tag via the same mapping rule `## UC/Domain Tag Convention` documents (`UC-{zero-padded-id}` from the row's `ID` column) and classify it into exactly one of three states against the scan above: **covered** (a **real**-labeled match was found), **scaffolded only** (only a **scaffolded-only**-labeled match was found — no real test exists for this use case yet, only a placeholder from a prior Phase 3 run), or **uncovered** (no match at all). If `product.md` or its use-case table cannot be found in this repo, report that fact explicitly for the use-case list below — do not report an empty "nothing uncovered" list when the source itself is missing.

Independently, read this repo's `.claude/rules/architecture.md` Functional Domains table (`Domain | Purpose | Key Components | Key Functions`) in full — every row. For every row, derive its expected tag (`domain-{name}`, matching the row's `Domain` column value to a `.claude/skills/domain-{name}/` directory name per the same mapping rule) and check it against the domain-tag set the scan above found (domain tags have no scaffolded-only concept — Phase 3 never scaffolds a domain-level placeholder, only UC-level ones — so a domain tag match is simply covered or not). If `architecture.md` or its Functional Domains table cannot be found in this repo, report that fact explicitly for the domain list below, the same way as above.

**Report three lists for use cases, never merged, plus one list for domains:**
- **Uncovered use cases** — every `product.md` row with no matching tag at all.
- **Scaffolded-only use cases** — every `product.md` row whose only matching test is still a Phase-3 placeholder, not yet real coverage.
- (Covered use cases need not be listed individually — only note the count, or state "No uncovered or scaffolded-only use cases found" if every row is genuinely covered.)
- **Uncovered domains** — every `architecture.md` Functional Domains row whose expected `domain-{name}` tag was not found anywhere in the test suite.

Keep the use-case and domain reporting separate because a domain can be exercised only indirectly, through UC-level tests that never carry that domain's own `domain-{name}` tag (a UC test tagged only `UC-08` still leaves `domain-velocity` unmapped even if UC-08's flow runs through the velocity domain), and the reverse can also happen (a `domain-{name}`-tagged test exists with no UC-level test covering the specific flow). Conflating the two into one list would hide exactly this distinction — the same distinction Phase 3 already takes care to keep separate when it says a `domain-{name}` tag never counts as coverage for a specific use case. Likewise, never fold "scaffolded-only" into "uncovered" or into "covered" — a scaffolded-only use case is neither: it has a placeholder that must not be silently forgotten, but it is not the same as having zero test at all, and reporting it as "covered" is exactly the false-positive this three-state model exists to prevent. If every row in a given source has a matching, real tag, state that explicitly too (e.g. "No uncovered domains found.") — a genuine zero-gap result must read differently from a missing source.

### Re-runnable, not one-time

State this plainly to the user as part of the report, every time this phase runs: this coverage view is not a one-time report generated only during bootstrap — it can be re-run at any point afterward, as the project gains new use cases or domains (from a later `go-deep` run) or new tests (hand-written or scaffolded). Tell the user explicitly, in the output: "Re-run `/make-it-work:define-test-strategy` at any time and choose the 'Re-check coverage only' option (shown whenever `.claude/rules/testing-strategy.md` already exists) to get a fresh view." No script is written or bundled to make this re-runnable — this phase itself, scanned and reported fresh on every invocation, is the entire mechanism; there is nothing else to install, schedule, or maintain.

### Output format

Present all of these lists directly in the chat response to the user. Do not write them to any file — this is a live report, not a persisted artifact. The only persisted outputs of this skill are the strategy file (Phase 2) and the scaffolded test files (Phase 3); this phase adds nothing to disk and modifies nothing on disk.

## Phase 5 — Wire Enforcement

### Applicability

This phase only ever runs for a repo that went through Phase 1's **fresh**, **extend**, or **adopt** path and continued past Phase 4 via that phase's "Offered at the end of a fresh/extend/adopt run" entry point. It never runs for a repo that arrived via Phase 1's case **(d) Re-check coverage only** — per Phase 4's own "Entry points" section, that path already ended the run for this repo at Phase 4, and this phase must not be reached for it under any circumstance.

### Rules Files entry — ensured, not always added

For each repo in scope reaching this phase, first check whether this repo's `CLAUDE.md` "Rules Files" section already has a row referencing `.claude/rules/testing-strategy.md` — this phase is reachable on an **extend**/**adopt** re-run (Phase 1's case (b)/(c)) just as much as on a **fresh** run, so a prior run may have already added this row. If a matching row already exists, leave it exactly as-is and move on to the checklist-item check below; do not add a second row or edit the existing one.

If no matching row exists yet, add `.claude/rules/testing-strategy.md` as a new row in the "Rules Files" section `go-deep` already creates there (the section listing all `.claude/rules/*.md` files with brief descriptions). Add one new row alongside the existing ones, with a one-line description such as "Test layers, coverage decision tree, test commands, and the UC/domain test-tagging convention." Do not touch or reorder any existing row in that section.

If this repo's `CLAUDE.md` has no "Rules Files" section at all, or the section that's there doesn't take the expected shape (a list/table of `.claude/rules/*.md` files), stop and ask the user where they'd like this reference added, naming the repo, rather than guessing a location or inventing a new section. (autopilot: see Autopilot Mode) Do not proceed to the checklist-item edit below for this repo until this is resolved.

### After Any Feature Change checklist item — ensured, not always added

For the same repo, first check whether the existing "After Any Feature Change — CRITICAL" section already has a checklist item instructing Claude to check the project's regression/coverage status before every commit (the exact wording this phase would otherwise insert, or close enough that it's clearly the same item from a prior run). If it does, leave it exactly as-is; do not insert a second, duplicate item.

If no such item exists yet, add one new checklist item to the existing "After Any Feature Change — CRITICAL" section `go-deep` already creates at the end of this repo's `CLAUDE.md`, instructing Claude to check the project's regression/coverage status — using the full-suite command documented in the strategy file's own `## Commands` section — before every commit. Insert this new item **first** in that checklist, before any existing "commit together" step already there — checking regression status logically precedes committing, not follows it. Renumber the numbered checklist consecutively from `1` after insertion; do not use `0` or leave duplicate numbers, and preserve the existing items' wording and order. This is a new item added inside `go-deep`'s existing section, never a new, separate rule file and never a competing section elsewhere in `CLAUDE.md`.

If this repo's `CLAUDE.md` has no "After Any Feature Change — CRITICAL" section, or what's there doesn't take the expected shape (a checklist `go-deep` itself would recognize as its own, including its quick-lookup table), stop and ask the user where they'd like this item added, the same way as the Rules Files case above, rather than guessing or inserting it into an unrelated section. (autopilot: see Autopilot Mode)

Both checks above run every time this phase is reached, including on an extend/adopt re-run: every repo reaching this phase ends up with exactly one Rules Files row and exactly one checklist item, regardless of whether this is the first time or a later re-run, and regardless of whatever the user decides about the hook below.

### Optional hook offer — opt-in, after both CLAUDE.md edits

Once both CLAUDE.md edits above are in place for this repo, offer the user a real pre-commit or pre-push hook as a strict addition on top of the CLAUDE.md instruction — never a substitute for it. Use a single `AskUserQuestion` call (`multiSelect: false`) with options along these lines (autopilot: see Autopilot Mode):
- `{ label: "No hook — CLAUDE.md instruction is enough (Recommended)", description: "Enforcement relies on Claude following the CLAUDE.md checklist item just added; no executable file is written." }`
- `{ label: "Also scaffold a real git hook", description: "Write a hook file into this repo that runs the full-suite command before every commit/push, enforced independently of Claude. It's tracked and shared with the team only if this repo already uses a hook manager like Husky — otherwise it's a local file each teammate must set up in their own clone." }`

Wait for the user's answer, then:
- **Declined** → proceed with the CLAUDE.md instruction as the only enforcement mechanism for this repo. Do not write any hook file.
- **Accepted** → detect whichever hook manager convention this repo already uses:
  - **Husky present** (a `.husky/` directory, or a `husky` entry in `package.json` devDependencies) → before writing, check whether `.husky/pre-commit` already has real content; if it does, stop and ask the user rather than overwriting an existing hook — the same guard the no-hook-manager path below already applies. (autopilot: see Autopilot Mode) Otherwise, write the hook script there. This path is version-controlled and automatically shared with every teammate who clones the repo, the same as the rest of `.husky/`.
  - **No hook manager present** → write a plain `.git/hooks/pre-commit` script instead. Tell the user explicitly, in plain language, that this fallback form is **not tracked by git** — it exists only in this local clone, and every other teammate (and every fresh clone, including CI) would need to set up the same file themselves for the hook to apply there too. Do not call it "versioned" — it is not. Before writing, check whether `.git/hooks/pre-commit` already has real content; if it does, stop and ask the user rather than overwriting an existing hook. (autopilot: see Autopilot Mode)
  - Either way, write a minimal, framework-agnostic hook template that shells out to the full-suite command documented in the strategy file's `## Commands` section — nothing more elaborate than that single call. Tell the user explicitly to review the generated hook before relying on it, since it now runs independently of Claude driving the session.

### Always both, hook is strictly additive

State this plainly to the user once this phase completes for a repo: the Rules Files entry and the After Any Feature Change checklist item are always added, regardless of what the user chooses about the hook. The hook, when accepted, is a strict addition on top of that CLAUDE.md instruction — it is never a substitute for it, and declining it never removes or weakens the CLAUDE.md edits already made.
