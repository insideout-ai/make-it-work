---
description: "Turns a spec or refined ticket into a concrete, execution-ready implementation plan — the plan-the-work step of the spec → plan-the-work → execute → review pipeline. Loads the project's skills, investigates the affected code across one or more repos, and writes an atomic, per-step plan file with no placeholders. When the target project has a test framework configured, it also writes and confirms per-step progression (red) and regression (currently-passing) tests. Use when planning how to implement a ticket, epic, or spec before any code is written."
---

# Implementation Planning Session

**Role:** Act as a senior engineer turning an agreed spec into an implementation plan another engineer (or a subagent) can execute step by step.

**Goal:** Read a spec or refined ticket, understand the requirement, load the project's own skills, investigate the real code paths that will change, and write an execution-ready plan to `make-it-work/<TICKET>-plan.md`. **Write no production code here beyond the test files and the minimal stub signatures this plan's Steps record, needed to reach a valid runtime red state on any stack** — a later step implements the rest and executes the plan one atomic step at a time, so every step must be independently verifiable.

This is the planning step of a pipeline: a spec already exists (e.g. from `close-the-gaps`), and after planning a separate step executes it, then `review-the-pr` reviews it.

---

## Usage

```
/make-it-work:plan-the-work [TICKET-ID | path/to/spec.md]
```

- Pass a ticket key (e.g. `PROJ-123`), an explicit path to a spec file, or nothing (the skill derives the key from the current branch).

**Rules before you begin:**

- Do NOT make assumptions silently — every inference becomes an explicit line in the plan's Assumptions.
- Always adhere to the coding rules and skill-loading instructions of each affected repo (its `CLAUDE.md`, `.claude/rules/`, etc.).
- Investigation is read-only. The only files you write in this skill are the plan itself and, per Step 5's per-step test-writing sub-phase, each step's test files (and any stub signature) when the target project has a test framework configured.

---

## Step 1 — Locate the workspace and the spec

### 1a. Detect the repo layout

Run `pwd`, then decide whether this is a **single repo** or a **coordinated multi-repo workspace**, because it changes how many "Affected Code" sections the plan has. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.

1. **`.git` exists here.** This repo is a project root. Then:
   - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`).
   - Otherwise → **single-repo project**, root is here — even if the parent happens to contain other, unrelated repos.
2. **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here. If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to plan for, rather than guessing.
3. **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop.

All paths below are relative to the root identified here. In a single-repo project, "each affected repo" simply means the one repo. When unsure between single and multi, prefer single-repo and widen only if the investigation in Step 4 shows the change genuinely crosses into a sibling repo.

### 1b. Locate the spec

Resolve the spec from the argument. **If the argument is an explicit path to a file, use it directly, skip the rest of this resolution, and do NOT touch any issue tracker** — the MCP fallback below is reachable only when no path was given and no local spec exists.

Otherwise determine the `<TICKET>` key:

- If the argument looks like a ticket key, use it.
- If the argument is empty, derive the key from `git branch --show-current` in the current (or most recently modified) repo, e.g. `feature/PROJ-123-add-x` → `PROJ-123`.
- If no argument was given and no key can be derived from the branch (e.g. on `main` or a branch that doesn't encode a key), do not proceed with an undefined `<TICKET>`: ask the user for the ticket key or an explicit spec path, and stop until they answer.

Then resolve the spec file **local-first, with an issue-tracker fallback**, using the first that exists:

1. `make-it-work/<TICKET>-spec.md` — the output of `close-the-gaps` (richest spec; preferred).
2. `_specs/<TICKET>.md` — the output of a `/spec`-style step, if the project uses one.

**If neither exists, check for a pending offline refinement before falling back to the tracker:** if `make-it-work/<TICKET>-questions.md` exists and its `**Status:**` marker is not `Answered` (i.e. it still reads `Awaiting Answers`), warn the user: "TICKET is mid-refinement — `make-it-work/<TICKET>-questions.md` has unanswered offline questions from `close-the-gaps`." and ask them to choose: **stop here and finish `close-the-gaps <path>` first** (recommended), or **proceed anyway** using whatever ticket content can be found below. Do not continue past this check silently. If the file doesn't exist, or its status is `Answered`, continue below without asking anything.

**If neither local spec file exists (or the user chose to proceed anyway above), fall back to the issue tracker:**

> **Guard:** This fallback is reachable ONLY when no explicit path was passed AND neither local spec file exists. If an explicit path was given, you already used it and stopped.

3. Fetch the ticket via whatever MCP integration is available for this project's tracker (Jira, Linear, GitHub Issues, etc.), including comments. A refined spec is often **pasted into a ticket comment** — scan comments (newest first) and pick the one carrying refinement signals: Gherkin `Scenario:` blocks, an `Acceptance Criteria` list, or a `TBD` / `Open Questions` / `Resolved Items` section.
   - If several qualify, prefer the most recent.
   - **Cache it locally:** write the chosen content to `make-it-work/<TICKET>-spec.md` so it's reviewable, diffable, and not re-fetched next run. Tell the user you did this.
   - If the ticket has only a raw description with no refinement, tell the user: "No refined spec found locally or in the ticket comments. Run `close-the-gaps <TICKET>` to produce one." and stop.
4. If the fetch fails (no MCP access, ticket not found), tell the user to run `close-the-gaps <TICKET>` first and stop.

Read the resolved spec in full before proceeding.

**Scope check:** If the spec covers two or more independent subsystems that could be built, tested, and deployed separately, stop and suggest splitting it into one plan per subsystem — each should produce working, testable software on its own. Wait for the user to confirm before continuing.

---

## Step 2 — Understand the requirement

Extract from the spec and hold onto these — they become sections of the plan. Do not proceed if a critical blocker exists.

- **Business goal** — what problem this solves and for whom.
- **Technical requirements** — what the system must do.
- **In scope / out of scope** — what is explicitly included or excluded.
- **Assumptions** — anything you are inferring that the spec does not state. List each one.
- **Open questions / blockers** — ambiguities in the spec. Stop and ask now only for *critical blockers* that make planning impossible; hold every other open question for the Step 4.5 Q&A, where code investigation will have sharpened it into a concrete "how" decision.

---

## Step 3 — Load the project's skills

Read whatever orientation docs and skills each affected repo actually has — its `CLAUDE.md` or `README`, any `docs/`, architecture notes, or ADRs, and any skills it ships — plus the coding rules the plan must respect, and lean on Step 4's code investigation for anything undocumented. Do not start planning a domain or flow you have loaded no context for.

**If the project was set up with `go-deep`, expect a predictable layout** and use it directly:

- A per-repo **`CLAUDE.md`** listing a skill inventory with trigger conditions, plus the coding rules the plan must respect.
- Two orientation files — a **product** view (the business / end-to-end use-case rules) and an **architecture** view (the structural / domain rules and constraints) — typically under `.claude/rules/`.
- Two layers of skills under **`.claude/skills/`**:
  - **domain skills** — one per functional domain: the architectural invariants, data contracts, and status/state rules that domain owns.
  - **use-case skills** — one per end-to-end flow: the step-by-step behavior, field mappings, and edge cases that flow must preserve.

**Read skills with the Read tool — do NOT use the Skill tool** — so you control exactly what you pull in and when.

### Discovery (repeat for every affected repo)

0. In a multi-repo workspace, **start with the workspace-root orientation file** (if any) — the service map, shared conventions, and cross-service call flow that frame the whole plan.
1. Read the repo's **`CLAUDE.md`** for its skill inventory and trigger conditions, then the **product** and **architecture** orientation files for the use-case list and the domain list.
2. Match the ticket's key nouns, verbs, and domain terms against the skill names and descriptions. Load the relevant **domain** skills first, then the **use-case** skills whose flow overlaps the ticket. When a use-case skill references a domain skill (or vice versa), load both — cross-referenced skills carry the constraints that matter most. When in doubt, load it: a false positive costs tokens, a miss costs a silent planning mistake.
3. If there is no `CLAUDE.md`, list `.claude/skills/` directly — each subdirectory is a skill — and match by name/description.

---

## Step 4 — Investigate the codebase

**Investigation discipline (read first):**

- **grep before read.** To locate a symbol, `grep -n` for it and Read only the matching window — never read a large file top-to-bottom hunting for a definition.
- **Repos touched only to confirm a fact get grep-only treatment.** If you enter a repo just to answer "does X route through Y?" or "does function Z exist?", answer with a grep. Do NOT read that repo's onboarding docs (`CLAUDE.md`, `architecture.md`, `product.md`) — read those in depth only in repos that will actually change.
- **Write the skeleton early.** Before deep investigation, ensure a `make-it-work/` folder exists at the root (create it if it doesn't). Then check whether `make-it-work/<TICKET>-plan.md` already exists **from a previous run** — if it does, ask whether to overwrite, suffix (`-v2`), or abort, and resolve that before writing anything. Once the target path is settled, write the skeleton with the sections you can already fill (Goal, Requirement Summary, Open Questions, a draft Affected Code table) **and the full `## Execution Status` block verbatim as given in Step 5's template — not an abbreviated form** — and mark unknowns `[INVESTIGATE: <question>]`. Then resolve only those markers. This caps scope and means a partial plan survives even if context runs out — including a died-mid-creation plan a fresh session later picks up cold, which is exactly why Execution Status must exist, in full, from the skeleton onward, not only once Step 5 fleshes the plan out.

Read the actual code paths the spec implies will change across **all affected repos**. Use Grep/Glob/Read to confirm:

**Direct impact** — what will change:

- Exact files, classes, functions, and types to modify in each repo.
- Existing patterns (architecture, logging, error handling, test structure) to follow in each repo.

**Indirect impact** — what the direct changes affect:

- Hidden dependencies, callers, shared types, and tests that will be affected.
- Cross-service interfaces (API contracts, event schemas, shared packages) that must stay in sync.
- Downstream consumers of the changed APIs or events.

**Codebase gaps** — document explicitly what is currently absent and must be added:

- Missing validations or invariants the spec assumes exist but do not.
- Missing test coverage on paths this ticket touches.
- Missing logging or error handling in affected code.
- Technical debt relevant to this ticket that must be addressed.

---

## Step 4.5 — Resolve open questions & confirm approach (interactive)

`close-the-gaps` already closed the product / **"what"** gaps upstream. Planning surfaces a second layer — the **"how"**: technical and scoping decisions the spec leaves open that would change the plan materially. Resolve those with the user now, once investigation has sharpened them, rather than guessing silently.

**Build the question list.** From Step 2's open questions and Step 4's findings, scan for "how" gaps:

1. **Approach** — two or more viable implementations (use the tradeoff format below).
2. **Scope boundary** — does the change extend to a sibling module/service the investigation surfaced, or stop at the one the spec names?
3. **Data / migration** — backfill existing rows? default for a new non-null column? migrate in place, dual-write, or lazily?
4. **Backward compatibility** — must the current API/event contract keep working, or is a breaking change acceptable — and who consumes it?
5. **Unspecified detail the spec assumes** — where a new field/flag/config lives; which existing pattern to follow when several compete.
6. **Missing prerequisite** — a validation, endpoint, or invariant the spec assumes exists but the code (per Codebase Gaps) does not have.
7. **Sequencing / rollout** — feature flag? cross-repo deploy order? staged rollout?

Ask only about gaps where guessing wrong would send the executor down the wrong path. Anything you can resolve safely from the codebase or a low-risk convention is **not** a question — record it as an Assumption in the plan instead.

**Ask in dependency-ordered waves** (same mechanics as `close-the-gaps`): `AskUserQuestion` can batch up to 4 questions into one call, rendered as navigable tabs the user can jump between and revise before submitting — but only when those questions don't depend on each other's answers.

- Before asking anything, check each gap against every other pending gap: does answering one change another's wording, options, or whether it's still needed? If so, the dependent one goes in a **later** wave, never the same batch. Common dependency: a `Scope boundary` or `Data / migration` answer often gates the options for a later `Sequencing / rollout` question. Independent gap types (most `Unstated assumption`, `Missing prerequisite`, unrelated `Approach` choices) default to Wave 1.
- Use **`AskUserQuestion`** for gaps with pre-enumerable answers; ask a genuinely open-ended gap as one concise plain-text question instead — outside the batch.
- Batch each wave's independent questions into a single `AskUserQuestion` call (≤4 per call); if a wave has more than 4, split into consecutive calls of ≤4 in that wave — order between them doesn't matter.
- Per question — `header`: a ≤12-char topic — e.g. `Approach`, `Migration`, `Scope`, `Compat`, `Rollout`.
- `question`: `"[Gap type]: [the question]\n\n[one sentence on why it changes the plan]"`.
- `options`: up to 3 substantive choices with the **recommended one first**, its label suffixed `(Recommended)` — base the recommendation on what the codebase already supports, the smallest safe scope, and the invariants in the loaded skills. Always end with a final option:
  `{ label: "Proceed with the recommended assumption", description: "Don't decide now — I'll document the default choice in the plan's Assumptions." }`
- Wait for the whole wave's answers before building the next wave. If a wave's answers open a new gap or unblock a dependent question, fold it into the next wave rather than re-opening one already asked.

**For an `Approach` gap specifically**, present the tradeoffs in full rather than as a one-line option list:

```
## Approach options

### Option A — <name>
<one-paragraph description>
**Pros:** …
**Cons:** …

### Option B — <name>
…

**Recommendation:** Option X — <one sentence why>
```

**Feed each answer into the plan:** an approach decision → the `## Approach` section; a scope / compatibility / migration / sequencing decision → the relevant Steps, Risks, or Pre-flight; a "proceed with the recommended assumption" answer → an explicit line in **Assumptions**. Additionally, record every question asked in this step — regardless of where else it fed in — into the `## Decision Log` section, in the order asked.

If no gap rises to this bar, say "No open planning questions — proceeding to draft." and continue.

---

## Step 5 — Draft the plan

Fill in the skeleton you wrote in Step 4 at `make-it-work/<TICKET>-plan.md` (the folder and any overwrite/`-v2`/abort decision were already handled there). Flesh every section out to full detail.

Guidelines:

- Reference exact file paths and function names from your investigation.
- No large code blocks — short snippets only where they clarify intent.
- Respect invariants surfaced by the loaded skills (status transitions, data-handling/compliance rules, ID/reference integrity, etc.).
- Discover the project's real **build / type-check / lint / test** commands (from `package.json` scripts, `Makefile`, `CLAUDE.md`, CI config, etc.) and use those in Verify/Pre-flight/Definition of Done — do not assume `npm`/`tsc`.

### Writing and confirming each step's tests

This sub-phase runs per step, as each step is drafted, evaluated independently per affected repo (see point 1 — a single-repo plan is just the one-repo case of that same rule). It is the test-file and stub-writing exception that **Rules before you begin** carves out of the read-only rule.

**Recorded on the step, not on Affected Code — deliberately.** Each step's test info lives in that step's own `**Tests:**` field under `## Steps` (see the plan template below), not in a separate per-repo table under `## Affected Code`. A step is the natural unit of "what test proves this is done," and `## Affected Code` is a file-level table, not a step-level one — keeping a step's implementation instructions and its verification info together is easier for an executor reading the plan top to bottom than splitting them across two sections.

1. **Applicability gate (per repo)** — evaluate this once per affected repo, never once for "the whole plan": a repo is in scope for this sub-phase only when it has a genuine, configured test framework — a real test command discoverable via the exact discovery the Guidelines above already perform (`package.json` scripts, `Makefile`, CI config, `CLAUDE.md`), and not merely a placeholder (e.g. npm's own default `"test": "echo \"Error: no test specified\" && exit 1"` script does not count as a configured framework). For a step whose Affected Code table lists more than one repo, evaluate this gate independently per repo — one repo may be in scope while a sibling repo, in the same step, is not. For a repo with no framework configured: omit the `**Tests:**` field for that repo's rows entirely; instead, author that repo's test scenarios directly as rows in the shared `## Test Plan` table, and use the plan template's conditional trailing `### Step N — Write tests` step for that repo's tests, scoped to that repo — exactly as `plan-the-work` produced before this sub-phase existed.
2. **Per-step classification** — for each step being drafted, in each in-scope repo, decide test-required (it introduces new or changed behavior, or touches code with regression risk) vs. exempt (neither applies). An exempt step gets a one-line reason recorded in its `**Tests:**` field instead of test information — never a silently omitted field.
3. **Naming the tests** — for a test-required step, name the progression test(s) that prove the new behavior and the regression test(s) that protect nearby existing behavior, reusing the exact investigation Step 4's "Indirect impact" sub-phase already performed to surface affected tests and callers.
4. **Reuse vs. write** — when adequate, currently-passing regression coverage already exists for that nearby behavior, reference its file path and command as-is rather than duplicating it; otherwise write or extend a regression test file.
5. **Confirming the regression baseline** — before touching any production code for this step, run the regression test(s) (whether reused or newly written in point 4) and confirm they currently pass. A regression test already failing at this point is a pre-existing issue unrelated to this step, not a valid state for this step, and must be resolved or called out separately before the step is considered ready.
6. **Reaching progression red** — write the progression test. Check the step's own Affected Code row for the symbol/file it names: if the row is **New** (the symbol or file does not exist yet), write a minimal stub signature — no real logic, a language-idiomatic "not implemented" throw/raise, or, only where a throwing expression isn't syntactically valid in that position, a type-satisfying sentinel — at that exact new location, carrying a same-line or adjacent comment unambiguously marking it as a planning-phase placeholder pending implementation, e.g. `// plan-the-work stub — pending implementation`, so it can never be mistaken for finished work. If the row is **Modify** (the symbol already exists and already runs), write no stub and touch no production code at all — the progression test simply asserts the new/changed behavior against the current, not-yet-updated implementation, which fails on its own because that behavior doesn't exist yet; this is an ordinary TDD red state needing no code change. In both cases, never rely on a bare compile/type/import error alone as proof of red, on any stack, typed or dynamic — a New row's stub is what turns that into a genuine runtime assertion failure; a Modify row already produces one without help. Run the progression test and confirm it now fails for the right reason — the missing or not-yet-changed behavior — not a broken test setup, import, or typo.
7. **Committing** — commit the step's test file(s) and any New-row stub signature onto the plan's own feature branch (the branch already established per Pre-flight's "On the correct branch" check) in one commit, immediately once that step's states are confirmed — not batched at the end of drafting — using this exact message format: `test: step <N> — <short step title> (red state)`.
8. **Recording** — record the file path(s), the exact scoped command, and the confirmed state (or the exemption reason) in the step's `**Tests:**` field.
9. **Multi-repo plans** — in a workspace plan, this entire sub-phase (points 1–8) runs separately for each repo a step's Affected Code table lists — each in-scope affected repo gets its own test files, its own commit, and its own `**Tests:**` entry for that step; an out-of-scope repo (per point 1) instead gets that step's scenarios added to the shared `## Test Plan` table for that repo.

### Plan structure

Reproduce this section structure. Keep every section (write "None" where empty rather than deleting it).

````markdown
# Plan for <TICKET> — <feature-title>

> **Spec:** `<resolved spec path>` · **Target branch:** `<branch>` · **For executors:** complete steps in order unless a step is marked **parallel**; do not proceed past a step until its **Verify** passes; do not edit files not listed in Affected Code.

## What This Changes

3–6 sentences, plain business/technical language a non-implementer can follow: what will be different after this plan is executed, and why it matters. No file paths, function/class/method names, or code snippets — those live in Affected Code and Steps.

## Execution Status

_This section is owned by `execute`, not `plan-the-work` — `plan-the-work` writes it once, verbatim, as part of the initial skeleton, and never edits it again. Everything below is written for whichever session runs `execute` against this plan._

**Mode:** Not yet chosen. Before doing anything else — even if you were only handed this file with no memory of it being created — ask the user to choose:
- **Subagent-Driven** — dispatch a fresh subagent per step (via the Agent tool), reviewed between steps.
- **Inline** — execute steps in this session, checkpointed after each step's Verify.

Do not invent a different execution strategy. Once chosen, update this line to the chosen mode.

**Progress:** Step 0 of N complete. Update this line immediately after each step's Verify passes.

## Open Questions & Blockers

Resolve before starting. If none: _None — all questions resolved before planning._

## Decision Log

Questions asked during Step 4.5 and how they were resolved, in the order asked. If none were asked: _None — no planning questions were needed._

| Question | Gap Type | Answer |
| --- | --- | --- |
| [full question text as asked] | [gap type from Step 4.5's list] | [option the user picked, verbatim — or "Proceed with the recommended assumption"] |

## Goal

One paragraph, for the executor: the system's technical end-state after this plan runs — what changed at the code/data/interface level — and a link to the spec. (`What This Changes` above covers the same event for a non-technical reader; this section covers it for whoever implements it.)

## Requirement Summary

| | |
| --- | --- |
| **Business goal** | Who benefits and what problem it solves |
| **In scope** | What this plan covers |
| **Out of scope** | What it explicitly excludes |
| **Assumptions** | Anything inferred that the spec does not state |

## Approach

Key design decisions. Explain _why_ — alternatives considered and why rejected. The executor follows these without re-deriving them. No file paths, function/class/method names, or code snippets in this section — name approaches/patterns conceptually; file-level specifics belong in Affected Code and Steps only.

## Affected Code

### `<repo-name>`  <!-- one section per affected repo; a single-repo plan has just one -->

| File | Change | Summary |
| --- | --- | --- |
| `path/to/file` | New / Modify / Delete | One-line description |

**Indirect impact:** callers, consumers, or downstream services affected by the above.

## Codebase Gaps

What is currently absent and must be added as part of this ticket (validations, tests, logging/error handling, relevant tech debt).

## Risks

| Risk | Severity | Mitigation | Residual severity |
| --- | --- | --- | --- |
| … | High / Med / Low | … | High / Med / Low |

**Overall risk (before mitigations):** High / Med / Low — the highest value in the Severity column above.
**Overall risk (after mitigations):** High / Med / Low — the highest value in the Residual severity column above, escalated to High if three or more rows carry a Medium residual severity.

Include cross-repo deployment order and rollback approach here.

If Overall risk (after mitigations) is High, add:

### Phasing alternative

A smaller, independently-shippable first phase that lowers residual risk (e.g. a read-only phase before a write phase, a feature-flagged rollout, a reduced pilot scope) — an alternative the user can choose instead of executing the full plan at once.

## Pre-flight

The "Working tree clean" check below applies once, before planning starts — the per-step test commits the test-writing sub-phase produces as planning proceeds (see the `### Writing and confirming each step's tests` subsection above) are an expected, intentional deviation from a clean tree, not a Pre-flight violation.

Stop and flag if any fail before writing code.

- [ ] On the correct branch, branched from `<base>`
- [ ] Build passes on the unmodified branch (clean baseline)
- [ ] Working tree clean (`git status`), no unresolved conflicts
- [ ] _(project-specific prereqs)_

## Steps

### Step 1 — <title>

- **Files:** `path/to/file`
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** concrete instructions — exact file path, function name, field names. Short snippet only if the shape is non-obvious.

**Verify:** type-check/build passes with no new errors; _(specific observable check)_.

**Tests:** for a single-repo step (or a step whose Affected Code table lists one in-scope repo): `<file path(s)>, <exact command>, <confirmed state: "progression red — <reason>" / "regression passing">` — or, for an exempt step, `Exempt — <one-line reason>`. For a step whose Affected Code table lists more than one repo, one line per repo, since point 9 above requires each in-scope repo to get its own entry: `<repo-name>: <file path(s)>, <exact command>, <confirmed state>` (repeated per repo, each on its own line) — an out-of-scope repo (no test framework, per point 1) is simply omitted from this field, since its scenarios already live in that repo's own `## Test Plan` rows instead.

### Step N — Write tests

_Only used for a repo where the per-step test-writing sub-phase's applicability gate (point 1 of the `### Writing and confirming each step's tests` subsection above) found no test framework configured — omit this step for a repo where a framework was found and tests were written per step instead. In a multi-repo plan with mixed framework availability across repos, this step still applies, scoped to whichever repo(s) lack a framework; in a single-repo plan with no framework, it covers the whole plan. When used, this is always the last step before Definition of Done._ Write the tests listed in the Test Plan for that repo. **Verify:** test suite passes; coverage on new files meets the project's bar.

## Test Plan

For a repo where the per-step test-writing sub-phase applies (a test framework is configured there), this section is a derived summary aggregating what each step's `**Tests:**` field already recorded for that repo — not a place to author new tests for it — and each such scenario row should reference which step its test came from. For a repo where no framework is configured, this section is instead the one place new test scenarios for that repo are authored directly, exactly as `plan-the-work` did before this sub-phase existed. A multi-repo plan may contain both kinds of row side by side.

| Scenario | Type | File / command |
| --- | --- | --- |
| Happy path | Unit | … |
| _(edge case)_ | Unit | … |
| _(failure scenario — DB error, downstream timeout)_ | Unit | … |
| _(regression — existing flow that must keep working)_ | Integration | … |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| _(AC from spec)_ | _(row above)_ |

## Definition of Done

- [ ] All ACs mapped to implementation + tests
- [ ] Test suite passes (no skipped/pending)
- [ ] Type-check / build / lint pass
- [ ] All **Verify** checkpoints green
- [ ] For every repo where the per-step test-writing sub-phase applies, every step's **Tests:** field is resolved — a test-required step's progression test is confirmed red and its regression test confirmed passing (or, once execution completes, confirmed green); no step's field is still an unaddressed placeholder. For any repo where no framework is configured, its `## Test Plan` rows and conditional `### Step N — Write tests` step cover it instead.
- [ ] Open questions resolved or escalated (owner named)
- [ ] Logging and error handling at the correct layers
- [ ] Security and authorization reviewed
- [ ] Backward compatibility confirmed (no silent breaking changes)
- [ ] DB migration documented (if schema changes)
- [ ] Rollback approach documented
- [ ] Cross-repo deployment order noted (if services deploy in sequence)
````

**No Placeholders rule** — the plan must be execution-ready. Never write:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling / validation / handle edge cases" without specifying what
- "Write tests for the above" without naming the scenarios
- "Similar to Step N" — repeat the specifics (the executor may read steps out of order)
- Steps that say _what_ without _which file, function, and how_
- References to types/functions/methods not introduced elsewhere in the plan

---

## Step 5.5 — Self-review the plan

Before handing off, run this quick self-check on the draft. It's a mechanical pass you run yourself — not a substitute for the independent review offered in Step 6:

1. **Spec coverage** — for each requirement and acceptance criterion, can you point to a step that implements it? Add steps for any gaps.
2. **Placeholder scan** — search for the anti-patterns above and fix every instance.
3. **Name consistency** — do method/type/field names in later steps match what earlier steps define? `processRefund()` in Step 3 but `handleRefund()` in Step 7 is a bug in the plan.
4. **Decision Log completeness** — does every question actually asked in Step 4.5 have a row in `## Decision Log`? Add any missing rows.
5. **Readability scan** — does `## What This Changes` (and `## Approach`) stay in plain prose with no file paths, function/class/method names, or code snippets? Fix any that slipped in.

Fix issues inline; don't re-review after fixing.

---

## Step 6 — Final output

After saving and self-reviewing, respond with:

```
Ticket: <TICKET>
Spec: <resolved spec path — e.g. make-it-work/<TICKET>-spec.md, _specs/<TICKET>.md, or "fetched from ticket comment, cached to make-it-work/<TICKET>-spec.md">
Plan: make-it-work/<TICKET>-plan.md
Repositories: <comma-separated list>
Assumptions: <count>
Open questions: <count>
Overall risk: <before mitigations> → <after mitigations>
Recommended executor tier: <low | standard | high> — <one-line reason>
```

If Overall risk (after mitigations) is High, also print the plan's `### Phasing alternative` summary in chat here — that's where the user actually decides, not buried in the file.

**Recommended executor tier** — how capable a model should execute this plan, derived purely from the plan you just wrote (no new investigation): read off the Affected Code table (repo/file count), the Risks table (risk surface), and the Steps (count + additive vs invasive):

- **low** — mechanical, few files, additive, no data-migration / state-transition / security risk, steps fully specified.
- **standard** — moderate: a few domains or repos, some risk, mostly-specified steps.
- **high** — multiple repos with logic changes, security / state transitions / data migrations / cross-service flows, or steps that still need judgment during execution.

Tier, not a model name — map it to whatever model lineup the executor uses. `execute` re-derives this same tier independently, directly from the plan file, and applies it when it runs: under Inline mode it's informational for the user to apply themselves if they want (e.g. via `/model`); under Subagent-Driven mode, `execute` passes a model matching this tier as the `model` argument on each `Agent` dispatch it makes.

Then tell the user the plan is ready — this skill never drives step execution itself, so it never asks the Subagent-Driven-vs-Inline question or touches `## Execution Status` beyond the skeleton it already wrote:

**"Plan saved. Run `/make-it-work:execute <TICKET>` (or `/make-it-work:execute make-it-work/<TICKET>-plan.md`) when you're ready to implement it — it will ask you to choose Subagent-Driven or Inline execution the first time it runs, and a later re-run picks up wherever the last one left off."**

Leave `## Execution Status` exactly as the skeleton wrote it (`Mode: Not yet chosen`, `Progress: Step 0 of N complete`). `execute` owns asking for Mode (once, the first time it runs against this plan) and owns updating both Mode and Progress from that point on — `plan-the-work` never edits this section after the initial skeleton, regardless of what the user says next.

**Optional — independent review:** for a high-effort or high-risk plan, offer a fresh-eyes pass that your Step 5.5 self-check can't provide: "I can dispatch a plan-reviewer subagent — fresh context, hasn't seen my reasoning — to pressure-test the plan for gaps and unstated assumptions before you start. Want that?" (This is the only independent review the plan itself gets; `review-the-pr` later reviews the code, not the plan.)

Do not paste the full plan in chat unless the user asks.
