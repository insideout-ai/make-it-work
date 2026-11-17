---
name: plan-the-work
description: "Turns a spec or refined ticket into a concrete, execution-ready implementation plan — the plan-the-work step of the spec → plan-the-work → execute → review pipeline. Loads the project's skills, investigates the affected code across one or more repos, and writes an atomic, per-step plan file with no placeholders. When the repo has a test-strategy skill or a configured test framework, it also writes and confirms per-step progression (red) and regression (currently-passing) tests. Use when planning how to implement a ticket, epic, or spec before any code is written."
disable-model-invocation: true
---

# Implementation Planning Session

For generated files under `make-it-work/`, follow the [artifact naming, Git protection, usage and timing contract](../../docs/artifact-observability.md). Use helper-returned paths; new runs use `miw-` filenames and existing runs retain their saved convention. Before manually writing a new Markdown/JSON artifact, resolve its actual output with `node "<base>/../../scripts/artifact-output.mjs" resolve --root <project-root> --directory <artifact-directory-relative-to-project> --name <logical-filename>` and write/link the returned `file`/`relative`. Literal filenames below identify logical roles; do not bypass this resolver by writing those examples directly.

**Role:** Act as a senior engineer turning an agreed spec into an implementation plan another engineer (or a subagent) can execute step by step.

**Goal:** Read a spec or refined ticket, understand the requirement, load the project's own skills, investigate the real code paths that will change, and write an execution-ready plan to `make-it-work/<TICKET>/<TICKET>-plan.md`. **Write tests in the project's chosen placement, including embedded test code/examples, and only the minimal new stub signatures this plan's Steps record to reach a valid runtime red state. Leave existing implementation logic unchanged** — a later step implements the rest and executes the plan one atomic step at a time, so every step must be independently verifiable.

This is the planning step of a pipeline: a spec already exists (e.g. from `close-the-gaps`), and after planning a separate step executes it, then `review-the-code` reviews it.

**When owned by implement:** follow [ticket-scoped context discovery](../implement/references/context-discovery.md) for absent or partial go-deep context. Use available guidance and scoped code/test evidence; do not require optional go-deep files, invent missing rules, or create onboarding structure. Explicit mandatory loading gates remain binding. This overrides the go-deep layout assumptions below only for implement-owned runs and must be forwarded to nested delegates.

---

## Load the applicable guides

Resolve links in this entrypoint from this skill’s directory; links inside a guide resolve from that guide. Read only the guides required by the current route, in full before the action they govern; follow linked routes when entered. A missing required guide is a blocker, not permission to improvise.

- **Implement-owned invocation:** read [implement integration](references/implement-integration.md) before any workflow action; its overrides take precedence over standalone procedures below.
- **Effective Autopilot:** read [Autopilot policy](references/autopilot.md) before starting or making an automatic decision, including after a saved-mode change.

## Usage

```
/make-it-work:plan-the-work [TICKET-ID | path/to/spec.md] [--autopilot]
```

- Pass a ticket key (e.g. `PROJ-123`), an explicit path to a spec file, or nothing (the skill derives the key from the current branch). `--autopilot` can appear anywhere in the arguments — strip it out before resolving the ticket-key/path argument above, so a bare `--autopilot` with no other argument is treated exactly like no argument at all.
- **No `--autopilot`** — interactive. Every `AskUserQuestion` and checkpoint below pauses for a human, exactly as documented.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing. Exception: an existing-plan-file collision (see Autopilot Mode) is never silently overwritten.

**Rules before you begin:**

- Do NOT make assumptions silently — every inference becomes an explicit line in the plan's Assumptions. The accepted refined spec defines the "what"; assumptions and technical choices may fill implementation gaps only when consistent with it. The original ticket is context, not an authority that overrides refinement.
- **Evidence for design-critical assumptions:** when a technical assumption being wrong could cause data loss, break compatibility, or invalidate substantial implementation work, inspect the relevant code, tests, or authoritative contract before treating it as established. Record the evidence and its limits in the existing Assumptions/Risks and affected steps. If still unverified, identify a bounded validation task before dependent implementation, including the observation that would require changing the approach; keep those steps blocked until the result supports them, or return an actionable blocker when validation is unavailable. Stay within planning's read-only permissions: do not perform live writes or install tooling to prove an assumption. A user-selected approach or Autopilot recommendation does not establish a technical guarantee, and mocks cannot prove an external provider's behavior. Already-supported guarantees need no redundant probe; ordinary low-risk implementation choices retain the existing Assumptions/Q&A flow. Product decisions and requirements conflicts retain their existing resolution rules.
- **Requirements conflicts:** if investigation reveals a contradiction that needs a requirements decision, stop dependent planning before writing tests/stubs for that behavior. Cite the spec criterion and evidence; return to `close-the-gaps` for explicit resolution in every autonomy mode. Do not encode a changed requirement as an Assumption or infer approval from overall plan approval. Standalone, explain the conflict and request refinement. Under `implement`, return `Spec conflict: <criterion, evidence, decision needed>` with a blocked handoff (no completed plan); the parent owns the refinement route. A technical defect with a clear solution consistent with the spec remains planning work.
- Always adhere to the coding rules and skill-loading instructions of each affected repo (its `CLAUDE.md`, `.claude/rules/`, etc.).
- Investigation is read-only. Writes are limited to the plan, each step's tests and necessary new stub signatures under Step 5, and context updates about the existing system under Step 5.6. Tests may be in separate files or embedded in implementation files, including in a `(test scope only)` repo listed in Affected Code; embedded edits change only test code/examples, not existing implementation logic.

## Planning progress

Before each major activity, narrate one concrete sentence describing the upcoming work. For implement-owned runs, first read [the activity contract](../implement/references/activity.md) and save that exact sentence through its activity helper **before** the work starts. Use the supplied state path and implement directory. Standalone runs narrate in chat only; never create workflow state or a dashboard for narration, including for older implement runs without one.

Report these boundaries when applicable, in the order the work actually happens:

| Activity | Describe the upcoming work |
| --- | --- |
| Discovery | Loading relevant project guidance and tracing affected code, dependencies and existing tests. |
| Drafting | Defining or amending implementation steps and their coverage. |
| Regression baseline | Running the existing-behavior checks relevant to the planned change. |
| Test writing | Creating or extending progression/regression tests for the named behavior. |
| Red verification | Running progression tests to check that missing behavior causes the expected failure. |
| Final validation | Reviewing coverage, consistency and the plan's structural checks. |

These are activity boundaries, not new workflow phases or a fixed checklist. Test preparation still runs per step; activities can recur. Use major work chunks rather than per-tool updates or a mandatory entry for every step, and name the step/repo/behavior when useful. A sentence already covering the upcoming chunk needs no duplicate checkpoint. Skip inapplicable activities; if tests cannot run, describe checking prerequisites or recording the unavailable verification instead of claiming to run them. Keep observed results in the existing step evidence and result/transition mechanisms; an activity is not proof of success or expected red.

The same guidance applies to initial planning, replanning and amendments. For delegated work, the main session checkpoints the dispatch and keeps that description while waiting under the activity contract; delegates do not write workflow activity or dashboards. Do not invent intermediate milestones or heartbeats while a delegate runs. After its actual handback, report the next activity before continuing.

## Autopilot Mode

When `--autopilot` is effective, read this guide before Step 1 or any automatic decision/log initialization. In an implement-owned run, use the saved current mode and load it before the first automatic decision after a mode change. Never fabricate missing input or overwrite an existing standalone plan; use the guide’s non-destructive collision route. Read and follow the complete [## Autopilot Mode guide](references/autopilot.md).

## Step 1 — Locate the workspace and the spec

### 1a. Detect the repo layout

Run `pwd`, then decide whether this is a **single repo** or a **coordinated multi-repo workspace**, because it changes how many "Affected Code" sections the plan has. The distinction is not "does the parent hold other repos" — a bare folder of unrelated clones is not a workspace. It is "are these repos documented as one system": a **workspace-root orientation file** (a top-level `CLAUDE.md` / service map describing the sibling repos and how they call each other) is the signal that turns a folder of repos into a workspace.

1. **`.git` exists here.** This repo is a project root. Then:
   - If the **parent** holds a workspace-root orientation file that describes this repo as one service among siblings → you are inside one service of a multi-repo workspace; the **workspace root** is the parent (`..`).
   - Otherwise → **single-repo project**, root is here — even if the parent happens to contain other, unrelated repos.
2. **No `.git` here, but subdirectories have their own `.git`.** If a workspace-root orientation file ties them together → multi-repo workspace, root is here. If they are just unrelated clones with no unifying doc → ask the user which repo (or workspace) to plan for, rather than guessing (autopilot: see Autopilot Mode — remains a hard stop).
3. **None of these resolve** → tell the user: "Could not identify the project root. Please launch from the repo root, a service subdirectory, or the workspace root." and stop (autopilot: see Autopilot Mode — remains a hard stop).

All paths below are relative to the root identified here. In a single-repo project, "each affected repo" simply means the one repo. When unsure between single and multi, prefer single-repo and widen only if the investigation in Step 4 shows the change genuinely crosses into a sibling repo.

**Test-scope repos.** A repo named in an affected repo's test-strategy `## Test Locations` (Step 3), or explicitly confirmed as an external test location by implement's readiness report when no strategy exists, joins the plan as `` ### `<repo>` (test scope only) `` in Affected Code **only when a step writes or changes tests there**. Its root is that row's `Run from`, and its Affected Code paths are relative to that root. It never counts as a product change, and it does not turn a single-repo plan into a multi-repo workspace.

### 1b. Locate the spec

Resolve the spec from the argument. **If the argument is an explicit path to a file, use it directly, skip the rest of this resolution, and do NOT touch any issue tracker** — the MCP fallback below is reachable only when no path was given and no local spec exists.

Otherwise determine the `<TICKET>` key:

- If the argument looks like a ticket key, use it.
- If the argument is empty, derive the key from `git branch --show-current` in the current (or most recently modified) repo, e.g. `feature/PROJ-123-add-x` → `PROJ-123`.
- If no argument was given and no key can be derived from the branch (e.g. on `main` or a branch that doesn't encode a key), do not proceed with an undefined `<TICKET>`: ask the user for the ticket key or an explicit spec path, and stop until they answer (autopilot: see Autopilot Mode — remains a hard stop).

Then resolve the spec file **local-first, with an issue-tracker fallback**, using the first that exists:

1. `make-it-work/<TICKET>/<TICKET>-spec.md` — the output of `close-the-gaps` (richest spec; preferred).
2. `_specs/<TICKET>.md` — the output of a `/spec`-style step, if the project uses one.

**If neither exists, check for a pending offline refinement before falling back to the tracker:** if `make-it-work/<TICKET>/<TICKET>-questions.md` exists and its `**Status:**` marker is not `Answered` (i.e. it still reads `Awaiting Answers`), warn the user: "TICKET is mid-refinement — `make-it-work/<TICKET>/<TICKET>-questions.md` has unanswered offline questions from `close-the-gaps`." and ask them to choose: **stop here and finish `close-the-gaps <path>` first** (recommended), or **proceed anyway** using whatever ticket content can be found below. Do not continue past this check silently (autopilot: see Autopilot Mode). If the file doesn't exist, or its status is `Answered`, continue below without asking anything.

**If neither local spec file exists (or the user chose to proceed anyway above), fall back to the issue tracker:**

> **Guard:** This fallback is reachable ONLY when no explicit path was passed AND neither local spec file exists. If an explicit path was given, you already used it and stopped.

3. Fetch the ticket via whatever MCP integration is available for this project's tracker (Jira, Linear, GitHub Issues, etc.), including comments. A refined spec is often **pasted into a ticket comment** — scan comments (newest first) and pick the one carrying refinement signals: Gherkin `Scenario:` blocks, an `Acceptance Criteria` list, or a `TBD` / `Open Questions` / `Resolved Items` section.
   - If several qualify, prefer the most recent.
   - **Cache it locally:** write the chosen content to `make-it-work/<TICKET>/<TICKET>-spec.md` so it's reviewable, diffable, and not re-fetched next run. Tell the user you did this.
   - If the ticket has only a raw description with no refinement, tell the user: "No refined spec found locally or in the ticket comments. Run `close-the-gaps <TICKET>` to produce one." and stop (autopilot: see Autopilot Mode — remains a hard stop).
4. If the fetch fails (no MCP access, ticket not found), tell the user to run `close-the-gaps <TICKET>` first and stop (autopilot: see Autopilot Mode — remains a hard stop).

Read the resolved spec in full before proceeding.

**Scope check:** If the spec covers two or more independent subsystems that could be built, tested, and deployed separately, stop and suggest splitting it into one plan per subsystem — each should produce working, testable software on its own. Wait for the user to confirm before continuing (autopilot: see Autopilot Mode).

---

## Step 2 — Understand the requirement

Extract from the spec and hold onto these — they become sections of the plan. Do not proceed if a critical blocker exists.

- **Business goal** — what problem this solves and for whom.
- **Technical requirements** — what the system must do.
- **In scope / out of scope** — what is explicitly included or excluded.
- **Assumptions** — anything you are inferring that the spec does not state. List each one.
- **Open questions / blockers** — ambiguities in the spec. Stop and ask now only for *critical blockers* that make planning impossible (autopilot: see Autopilot Mode). Do not carry the rest into Step 4.5 unchanged: send each through Step 4.5's triage, where most become Assumptions or are dropped because the spec already settles them.

---

## Step 3 — Load the project's skills

**Progress:** narrate discovery before loading guidance and investigating the affected code; checkpoint it for participating implement runs.

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
4. Read the repo's **`.claude/skills/test-strategy/SKILL.md`** with the Read tool when it exists — it supplies locations, layers, commands, prerequisites, destinations and the maintained test map. Read `<base>/../../docs/test-map-contract.md` before querying/refreshing mappings. Validate registration/freshness, reuse unchanged entries and reassess affected tests/evidence. Planning may persist reviewed map updates; record per-test strategy layers (or `unknown`) on discovered/reassessed entries, regenerate `.claude/testing/TEST-MAP.md` per the contract, and add both paths to Affected Code or the accepted setup baseline, without adding another product/test-scope repo solely for metadata. Never modify source/tests for annotations. Missing/malformed maps under the current strategy use temporary discovery until metadata is saved. If Repo ID differs from the directory name, warn about repo resolution and continue. Older strategies without `## Test Map` need regeneration through define-test-strategy; record an Assumption and proceed using actual runner configuration, not tag guidance. Never convert or delete old testing-rule metadata.

---

## Step 4 — Investigate the codebase

**Investigation discipline (read first):**

- **grep before read.** To locate a symbol, `grep -n` for it and Read only the matching window — never read a large file top-to-bottom hunting for a definition.
- **Repos touched only to confirm a fact get grep-only treatment.** If you enter a repo just to answer "does X route through Y?" or "does function Z exist?", answer with a grep. Do NOT read that repo's onboarding docs (`CLAUDE.md`, `architecture.md`, `product.md`) — read those in depth only in repos that will actually change.
- **Fork substantial exploration to a subagent.** When the investigation spans multiple files, multiple loaded skills, or multiple repos — an independently reviewable unit of work, not a single targeted lookup — dispatch it to a fresh subagent (the `Explore` or `general-purpose` agent type, via the Agent tool) and work from its returned report, rather than reading every file directly in this session. A single grep-and-confirm check stays inline, same as the bullet above.
- **Write the skeleton early.** Before deep investigation, ensure a `make-it-work/<TICKET>/` directory exists at the root (create it if it doesn't). Then check whether `make-it-work/<TICKET>/<TICKET>-plan.md` already exists **from a previous run** — if it does, ask whether to overwrite, suffix (`-v2`), or abort, and resolve that before writing anything (autopilot: see Autopilot Mode). Once the target path is settled, write the skeleton with the sections you can already fill (Goal, Requirement Summary, Open Questions, a draft Affected Code table) **and the full `## Execution Status` block verbatim as given in Step 5's template — not an abbreviated form** — and mark unknowns `[INVESTIGATE: <question>]`. Then resolve only those markers. This caps scope and means a partial plan survives even if context runs out — including a died-mid-creation plan a fresh session later picks up cold, which is exactly why Execution Status must exist, in full, from the skeleton onward, not only once Step 5 fleshes the plan out.

Read the actual code paths the spec implies will change across **all affected repos**. Use Grep/Glob/Read to confirm:

**Direct impact** — what will change:

- Exact files, classes, functions, and types to modify in each repo.
- Existing patterns (architecture, logging, error handling, test structure) to follow in each repo. When the repo has a test-strategy skill, test destinations come from Where New Tests Go, including selected planned destinations that require setup. Read their Status alongside Layers; a directory choice is not evidence the layer is runnable.

**Indirect impact** — what the direct changes affect:

- Hidden dependencies, callers, shared types, and tests that will be affected. Query current test-map relationships for every touched UC/domain across all Test Locations, following How to Scan and the shared contract. Reassess affected dependencies incrementally; missing/malformed maps under the current strategy use discovery of all placements without adding annotations. Keep uncertain relationships unresolved.
- Cross-service interfaces (API contracts, event schemas, shared packages) that must stay in sync.
- Downstream consumers of the changed APIs or events.

**Codebase gaps** — document explicitly what is currently absent and must be added:

- Missing validations or invariants the spec assumes exist but do not.
- Missing test coverage on paths this ticket touches — with a strategy, a touched token with no current mapped relationship after complete assessment across all locations. Distinguish unresolved/stale mappings and incomplete discovery from confirmed gaps; absence of annotations is never a coverage gap.
- Missing logging or error handling in affected code.
- Technical debt relevant to this ticket that must be addressed.

---

## Step 4.5 — Resolve open questions & confirm approach (interactive)

`close-the-gaps` already closed the product / **"what"** gaps upstream. Planning surfaces a second layer — the **"how"**: technical and scoping decisions the spec leaves open that would change the plan materially. Resolve those with the user now, once investigation has sharpened them, rather than guessing silently.

**Triage every candidate first.** Classify each possible gap from Step 2's open questions and Step 4's findings before it can become a question:

1. **Already settled.** The spec's ACs, Decision Log, Resolved Items or TBD list already cover it. Drop it. A TBD is an accepted open item, not an invitation to ask again. Never re-ask something close-the-gaps already recorded.
2. **"What" gap.** The answer would change behavior someone can observe, or an acceptance criterion, and the spec says nothing about it. (If the spec contradicts itself or the code, that's a requirements conflict and follows **Rules before you begin**, not this triage.)
   - *Minor:* the spec's intent, an equivalent existing flow, or a loaded skill points to one behavior. Record it as an Assumption that starts with `Spec gap:`.
   - *Material:* reasonable readings of the spec lead to different user-visible behavior, and none is clearly implied. Ask it as a **Spec gap question** (below).
3. **"How" gap.** The answer changes only the implementation. Apply the asking bar below.

**Asking bar for "how" gaps.** Ask only when all three are true:

- (a) Two or more workable options differ clearly in cost, risk or how easily they can be undone.
- (b) The codebase, the loaded skills and the project's conventions don't already point to one.
- (c) A wrong choice would be expensive to undo after execution (data shape, a public contract, the order of changes across repos).

Everything else becomes an Assumption, with the reason. Most plans need one wave of questions or none. If more than 4 questions survive triage, check each against the bar again before asking.

**Build the question list.** The "how" gaps that pass the bar fall into these types:

1. **Approach** — two or more viable implementations (use the tradeoff format below).
2. **Change surface** — which modules or services have to change to meet the spec, when the investigation shows the one the spec names can't do it alone. *Whether* to widen scope is a "what" gap.
3. **Data / migration** — backfill existing rows? default for a new non-null column? migrate in place, dual-write, or lazily?
4. **Contract compatibility** — whether an existing API, event or schema can change shape or has to stay compatible, given the consumers the investigation found. Whether a consumer *should* see different behavior is a "what" gap.
5. **Placement / pattern** — where a new field, flag or config lives, and which existing pattern to follow when several compete.
6. **Missing prerequisite** — a technical prerequisite (validation, endpoint, invariant) the spec assumes exists but the code (per Codebase Gaps) does not have. If the missing piece changes what users get, it's a "what" gap.
7. **Sequencing / rollout** — feature flag? cross-repo deploy order? staged rollout?

**Spec gap questions.** Ask material "what" gaps in the same waves as the other questions:

- `header`: `Spec gap`
- `question`: `"Spec gap: <question>\n\n<what the spec leaves out, and the code evidence>"`
- `options`: the recommended behavior, labeled `(Recommended)`; one alternative; and `{ label: "Needs PM — route to close-the-gaps", description: "Pause planning for this behavior and refine the spec with close-the-gaps (offline/Slack available)." }`. Spec gap questions have no "Proceed with the recommended assumption" option.

If the user chooses to route the question, stop planning anything that depends on it, as for a requirements conflict. Standalone, tell the user to run `close-the-gaps <TICKET>` and bring the question with them. Under `implement`, return it through the existing `Spec conflict: <criterion, evidence, decision needed>` handoff.

If the user picks a behavior, record the answer in the plan's Decision Log with Gap Type `Spec gap`. Standalone runs also add a row to the spec's `## Decision Log`, marked `_(answered during planning)_`. Under `implement`, leave the spec unchanged, because `implement` owns spec revisions.

**Ask in dependency-ordered waves** (same mechanics as `close-the-gaps`): `AskUserQuestion` can batch up to 4 questions into one call, rendered as navigable tabs the user can jump between and revise before submitting — but only when those questions don't depend on each other's answers.

After identifying those semantic dependencies, use `scripts/questions.mjs waves` under [the question-helper contract](../../docs/deterministic-artifacts.md#refinement-questions) to validate IDs/cycles and compute batches; do not manually schedule the graph.

- Before asking anything, check each gap against every other pending gap: does answering one change another's wording, options, or whether it's still needed? If so, the dependent one goes in a **later** wave, never the same batch. Common dependency: a `Change surface`, `Data / migration` or `Spec gap` answer often gates the options for a later `Sequencing / rollout` question. Independent gap types (most `Placement / pattern`, `Missing prerequisite`, unrelated `Approach` choices) default to Wave 1.
- Use **`AskUserQuestion`** for gaps with pre-enumerable answers; ask a genuinely open-ended gap as one concise plain-text question instead — outside the batch (autopilot: see Autopilot Mode).
- Batch each wave's independent questions into a single `AskUserQuestion` call (≤4 per call); if a wave has more than 4, split into consecutive calls of ≤4 in that wave — order between them doesn't matter.
- Per question — `header`: a ≤12-char topic — e.g. `Approach`, `Migration`, `Surface`, `Compat`, `Rollout`, `Spec gap`.
- `question`: `"[Gap type]: [the question]\n\n[one sentence on why it changes the plan]"`.
- `options`: up to 3 substantive choices with the **recommended one first**, its label suffixed `(Recommended)` — base the recommendation on what the codebase already supports, the smallest safe scope, and the invariants in the loaded skills. For "how" gaps, always end with a final option:
  `{ label: "Proceed with the recommended assumption", description: "Don't decide now — I'll document the default choice in the plan's Assumptions." }` (autopilot: see Autopilot Mode — never auto-selected, since a substantive recommended option is always available to pick instead)
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

**Progress:** narrate drafting or amendment before fleshing out the steps and coverage, following Planning progress above.

Fill in the skeleton you wrote in Step 4 at `make-it-work/<TICKET>/<TICKET>-plan.md` (the folder and any overwrite/`-v2`/abort decision were already handled there). Flesh every section out to full detail.

Guidelines:

- Reference exact file paths and function names from your investigation.
- No large code blocks — short snippets only where they clarify intent.
- Respect invariants surfaced by the loaded skills (status transitions, data-handling/compliance rules, ID/reference integrity, etc.).
- Discover the project's real **build / type-check / lint / test** commands (from `package.json` scripts, `Makefile`, `CLAUDE.md`, CI config, etc.) and use those in Verify/Pre-flight/Definition of Done — do not assume `npm`/`tsc`. When a repo has a test-strategy skill, its selected layers/destinations come from Layers and Where New Tests Go, while runnable commands come only from configured rows and Test Locations → Run from. Planned/deferred rows and Recommended Setup are not runnable command sources. Legacy layer/destination rows without Status retain their previous configured-only meaning, subject to the actual setup and Run Prerequisites.
- When `implement` supplies testing readiness, copy its per-repo `## Verification Policy` table into the plan. Active automated rows must describe actual configured tooling; a `## Recommended Setup` section is a proposal, never a source of runnable commands. Manual rows require a user's choice, an explicit project policy, or implement's recorded missing-strategy/absent-tooling `autonomy-default`. Copy that source unchanged; never create a late manual fallback. Without a strategy, use readiness's actual commands, prerequisites, test destinations and scoped code/test evidence; do not require or generate strategy/map metadata. Record the supplied setup files as an accepted baseline in Pre-flight and Affected Code; do not discard them or treat their intentional dirty worktree as a failed clean-tree check. Outside `implement`, record a policy only when the modes and manual authorization have actually been resolved; otherwise write `None` and retain legacy behavior.

### Writing and confirming each step's tests

This sub-phase runs per step, as each step is drafted, evaluated independently per affected repo (see point 1 — a single-repo plan is just the one-repo case of that same rule). It is the test-file and stub-writing exception that **Rules before you begin** carves out of the read-only rule.

**Progress boundaries:** drafting, test authoring, running a regression baseline and running progression tests are separate major activities. Before switching between them, narrate and checkpoint the new activity under Planning progress above. Do not batch authoring and both kinds of test execution behind one generic planning sentence or one shell call. Reuse the current checkpoint only while its described work is still the actual activity.

**Recorded on the step, not on Affected Code — deliberately.** Each step's test info lives in that step's own `**Tests:**` field under `## Steps` (see the plan template below), not in a separate per-repo table under `## Affected Code`. A step is the natural unit of "what test proves this is done," and `## Affected Code` is a file-level table, not a step-level one — keeping a step's implementation instructions and its verification info together is easier for an executor reading the plan top to bottom than splitting them across two sections.

**Selected layers and setup.** Before applying the no-framework fallback or writing a step's tests, match its changed behavior to Coverage Decision Guidance and the selected layer's Status. If a relevant selected layer is `planned`, surface its specific missing setup even when another layer is configured: under implement return `Testing readiness required: <repo>, <layer>, <prerequisites>, <intended destination>` before completing the stage or emitting a completed-plan handoff; standalone, stop at that setup prerequisite before writing/running tests requiring it. This is not the pre-existing-regression baseline blocker. Do not install tooling during planning, substitute unit tests for agreed component coverage, or silently convert missing setup to manual verification. Deferred layers retain their recorded risk/scope decision; if this requirement needs that coverage now, surface the decision to revisit rather than auto-activate it. Configured rows remain subject to Run Prerequisites.

1. **Applicability gate (per repo)** — evaluate this once per affected repo. An explicitly manual repo in `## Verification Policy` uses manual scenarios below. Otherwise a repo is in scope when its test-strategy skill lists a `## Test Locations` row with a layer (not `none`); without a strategy, it is in scope only with a genuine configured test framework and a discoverable real test command. A placeholder script such as npm's default `echo "Error: no test specified" && exit 1` does not qualify. A repo selected as automated by testing readiness that still has no usable tooling is a readiness blocker, not an implicit manual choice: return to `implement` with the reason. Evaluate multi-repo steps independently per repo. For manual or legacy no-framework repos, omit that repo from `**Tests:**`; author concrete scenarios in `## Test Plan` and add the conditional final `### Step N — Verify manual scenarios` step for checks that can actually run in-session. Classify known unavailable supplemental checks under Verification feasibility below. Name the repo and originating step in each scenario, with setup, actions and expected observations; keep scenario names unique. An unavailable browser, account or service is a verification prerequisite to surface, never an assumed pass.
2. **Per-step classification** — for each step being drafted, in each in-scope repo, decide test-required (it introduces new or changed behavior, or touches code with regression risk) vs. exempt (neither applies). An exempt step gets a one-line reason recorded in its `**Tests:**` field instead of test information — never a silently omitted field.
3. **Naming the tests** — for a test-required step, name the progression test(s) that prove the new behavior and the regression test(s) that protect nearby existing behavior, reusing the exact investigation Step 4's "Indirect impact" sub-phase already performed to surface affected tests and callers. With a test-strategy skill, choose each test's layer via its `## Coverage Decision Guidance` and record it as `[<layer>]`. Each new method, new branch and enumerated case the step's instructions introduce (every listed failure, error shape, status value or fallback) needs at least one named test that executes it with the layer that owns that behavior running for real. A test that stubs, mocks or calls around the owning layer covers its callers, not the new behavior. In a multi-layer read or call chain, name which layer owns each new behavior and which test runs through it; stub only what sits below it.
4. **Pre-edit planning authorization under Implement** — for a controller run with startup-baseline metadata, before it has entered Execute or Lightweight, and when the parent supplies its exact workflow state path, read `../implement/references/planning-tests.md`. Draft the numbered step with each exact test path in backticks in `**Tests:**`, then call its helper **before** writing/extending that test. Skip files already outside that baseline (Markdown, `docs/`, `.claude/`). Register dedicated test files or a bounded embedded-test region; retain all production bytes outside the registered region. Register each New-row stub with `kind: "stub"` (path declared in the step's `**Files:**`) before writing it, and use the exact marker `plan-the-work stub — pending implementation`; never reach a not-yet-existing member through untyped casts instead. This is a local checkpoint, with no user approval prompt. It does not authorize production implementation, commits, or edits in an earlier phase. Standalone planning without Implement's startup guard keeps its existing write rules.
5. **Reuse vs. write** — before substantial test authoring, report the test-writing activity, naming the behavior or repo when useful. Then, with a strategy, query its current map across all locations per How to Scan/the shared contract, refreshing affected portions only. Inspect actual assertions; a relationship alone is not adequate coverage. Reuse adequate currently-passing regression tests with their identities/selectors instead of duplicating them; otherwise write/extend a test in the selected placement. Register new/changed tests and behavior evidence in the product map, retaining user decisions and unresolved candidates. Mapping work never changes source/test annotations.
6. **Confirming the regression baseline** — report the baseline-check activity before running the checks. Then, before touching any production code for this step, run the regression test(s) (whether reused or newly written in point 5) and confirm they currently pass. A regression test already failing at this point is a pre-existing issue unrelated to this step, not a valid state for this step, and must be resolved or called out separately before the step is considered ready (autopilot: see Autopilot Mode). If the suite's `## Run Prerequisites` `Local run:` is not `yes`, or a listed env var is unset or a service check command fails, do not run it: record `regression not runnable locally — <reason>`. That is not a failure and never a `Blocked:` return.
7. **Reaching progression red** — report test writing before authoring the progression test, unless the current activity already covers it. Then write the progression test. With a test-strategy skill, use the repo, placement and naming its `## Where New Tests Go` names for the chosen layer (that may be a `(test scope only)` repo). When a strategy exists, for every placement register its identity, behavior-to-token evidence and supported selector in the product repo's shared test map; record identity/selector in the step's **Tests:** field. Do not add or maintain mapping comments in source/tests. Include map metadata in Affected Code and step Files when changed; map-only metadata does not add another product/test-scope repo. Tokens always use the **product** repo's Repo ID, including external tests. Preserve unresolved candidates and user decisions; update snapshots only after the required semantic reassessment. Any stub signature still goes in the product repo. Check the step's own Affected Code row for the symbol/file it names: if the row is **New** (the symbol or file does not exist yet), write a minimal stub signature — no real logic, a language-idiomatic "not implemented" throw/raise, or, only where a throwing expression isn't syntactically valid in that position, a type-satisfying sentinel — at that exact new location, carrying a same-line or adjacent comment unambiguously marking it as a planning-phase placeholder pending implementation, e.g. `// plan-the-work stub — pending implementation`, so it can never be mistaken for finished work. If the row is **Modify** (the symbol already exists and already runs), write no stub and leave implementation logic unchanged; when placement is embedded, edits to that source file are limited to its test code or executable test examples. The progression test asserts the new/changed behavior against the current, not-yet-updated implementation, which fails on its own because that behavior doesn't exist yet; this is an ordinary TDD red state needing no implementation change. In both cases, never rely on a bare compile/type/import error alone as proof of red, on any stack, typed or dynamic — a New row's stub is what turns that into a genuine runtime assertion failure; a Modify row already produces one without help. Before running it, report red verification as the next activity. Run the progression test using a supported selector and confirm it now fails for the right reason — the missing or not-yet-changed behavior — not a broken test setup, import, or typo. If embedded tests cannot be selected precisely, disclose and record the smallest supported enclosing module/package/suite before running; never pass source paths as positional test-file arguments without runner support. If the test is not runnable locally (point 6's rule), do not run it: record `progression written — not runnable locally (<reason>)`.
8. **Leaving it uncommitted** — do not commit the step's test file(s) or any New-row stub signature. They remain as plain, uncommitted working-tree changes — the same way `execute`'s own implementation changes are always left uncommitted — so a repo whose pre-commit hook blocks a failing test is never asked to accept one. The confirmed state is recorded in point 9 below, not in a commit message.
9. **Recording** — record the file path(s), the exact scoped command, and the confirmed state (or the exemption reason) in the step's `**Tests:**` field, as `<repo>: <file path(s)> [<layer>], <exact command>, <confirmed state>`.
10. **Multi-repo plans** — this entire sub-phase (points 1–9) runs separately for each repo whose tests a step needs — every repo its Affected Code table lists, plus any `(test scope only)` repo the step writes tests in. Each gets its own test files and its own `**Tests:**` entry for that step, with its command run from that repo's `Run from` root; an out-of-scope repo (per point 1) instead gets that step's scenarios added to the shared `## Test Plan` table for that repo.
11. **Domains/UCs Touched** — record each product repo's touched tokens in the plan's `## Domains/UCs Touched` section, one line per repo: `` `<repo>`: `<repo>:UC-<id>`, `<repo>:domain-<name>` `` (ids and names verbatim from go-deep's skill directory names; the prefix is the strategy's `## Repo ID`, else the repo's git-toplevel basename), or `None — <reason>`. `execute`'s gate reads it.

### Plan structure

Reproduce the exact structure in `references/plan-template.md` — keep every section (write "None" where empty rather than deleting it).

The skeleton's `## Execution Status` block starts with `Step 0 of N complete`. Once the final numbered steps are known, resolve `<base>` to this skill's directory and set the concrete total with `node "<base>/../execute/scripts/plan-status.mjs" set-total --plan "<plan path>" --total <step count>`. Use this command for the initial plan and each new replan; never hand-edit the Progress line. It preserves Mode and the completed count and rejects a shrinking total. Do not choose Mode or advance Progress here; `execute` owns those decisions and updates.
Run `set-total` as its own Bash tool call after the plan file has been saved; do not join it with a `.claude/` decision-log write or another command. If the script fails, correct the plan and rerun it before reporting the plan ready.

**No Placeholders rule** — the plan must be execution-ready. Never write:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling / validation / handle edge cases" without specifying what
- "Write tests for the above" without naming the scenarios
- "Similar to Step N" — repeat the specifics (the executor may read steps out of order)
- Steps that say _what_ without _which file, function, and how_
- References to types/functions/methods not introduced elsewhere in the plan

---

## Step 5.5 — Self-review the plan

**Progress:** narrate final validation before the structural checks and semantic coverage review.

First run `node "<base>/../../scripts/validate-plan.mjs" normalize-risk --plan "<plan path>"`, then `check --plan "<plan path>"`. Fix structural errors before returning a completed plan/handoff. This required validator owns section/step/dependency/file/scenario checks and risk arithmetic; retain the semantic coverage, naming intent and readability review below. A High calculated residual still requires the actual phasing alternative. The helper does not prove adequate behavioral coverage or resolve open decisions.

**Resolve contradictions before rating risk.** Review every Assumption and Risk against the accepted spec and its examples. If a recorded assumption predicts a different observable result, resolve the design or raise the missing product decision through refinement; documenting the mismatch or assigning Low residual risk is not a mitigation. Record the invariant, the chosen behavior and a boundary test/scenario. For date changes, distinguish a calendar date from an instant, name the authoritative timezone or date-only input, and cover a local/UTC day boundary (plus seasonal offsets when relevant). Apply the same reasoning to rounding, ordering and defaults; do not invent a timezone when the context does not establish one.

**Verification feasibility.** Identify deployment, account, integration and running-app prerequisites before adding verification steps. For an automated-policy repo, supplemental checks known to be unavailable in-session belong in `## Post-delivery Verification`, not a numbered execution step. Keep their concrete Test Plan scenarios and clause traceability, mark them not performed, and name the prerequisite and responsible actor. Do not downgrade an explicitly manual verification policy or move a required release check out of execution without authorization: surface that blocker/decision. When a layer is deferred, list exactly which clauses have only static/manual evidence. Test pure logic with existing supported tooling where practical; respect platform isolation and required duplication rather than extracting an unsupported shared helper or silently activating a deferred layer.

Before handing off, run this quick self-check on the draft. It's a mechanical pass you run yourself — not a substitute for the independent review offered in Step 6:

1. **Spec coverage** — for each requirement and acceptance criterion, can you point to a step that implements it? Add steps for any gaps.
2. **Placeholder scan** — search for the anti-patterns above and fix every instance.
3. **Name consistency** — do method/type/field names in later steps match what earlier steps define? `processRefund()` in Step 3 but `handleRefund()` in Step 7 is a bug in the plan.
4. **Decision Log completeness** — does every question actually asked in Step 4.5 have a row in `## Decision Log`? Add any missing rows.
5. **Readability scan** — does `## What This Changes` (and `## Approach`) stay in plain prose with no file paths, function/class/method names, or code snippets? Fix any that slipped in.
6. **Test scope** — is `## Domains/UCs Touched` filled (or `None — <reason>`)? Is every `(test scope only)` Affected Code section referenced by at least one step's `**Tests:**` line? Drop any that isn't.
7. **Behavior reachability** — for every test-required step, list each new method, branch and enumerated case in its instructions and point to the named test that runs it with its owning layer unstubbed (Step 5's point 3). Flag any step whose only tests stub, mock or bypass the layer that owns the new behavior, or that cover fewer cases than the instructions list, and add or redirect tests until each item is reached.

Fix issues inline; don't re-review after fixing.

---

## Step 5.6 — Context update

Skip this step silently when the project has no `go-deep` context to update (no `uc-*` / `domain-*` skills under `.claude/skills/` and no `.claude/rules/` files).

**Scope — current facts only.** Record facts about the *existing* code that Step 4's investigation confirmed and that a loaded skill or rules file states wrongly or omits: a function that moved or was renamed, an undocumented invariant, a stale file path, a caller the skill doesn't list. **Never** record the changes this plan intends to make — those enter the knowledge base only once they have actually been built.

- Record: "the refund service is now called from the nightly batch job, which the domain skill doesn't list."
- Do not record: "Step 3 will add a retry to the refund service."

**Where it goes** — follow `go-deep`'s layout and its UC-vs-domain separation and size targets:

- User-facing flow facts → the matching `uc-*` skill.
- Implementation facts (files, functions, data contracts) → the matching `domain-*` skill.
- Cross-cutting rules or constraints → `.claude/rules/product.md` or `.claude/rules/architecture.md`.

Write the updates directly, without a confirmation step. Most plans will have nothing to record; that is expected, not a gap.

---

## Step 6 — Final output

After saving and self-reviewing, respond with:

```
Ticket: <TICKET>
Spec: <resolved spec path — e.g. make-it-work/<TICKET>/<TICKET>-spec.md, _specs/<TICKET>.md, or "fetched from ticket comment, cached to make-it-work/<TICKET>/<TICKET>-spec.md">
Plan: make-it-work/<TICKET>/<TICKET>-plan.md
Repositories: <comma-separated list>
Test scope: <comma-separated test-only repos | none>
Assumptions: <count>
Open questions: <count>
Overall risk: <before mitigations> → <after mitigations>
Recommended executor tier: <low | standard | high> — <one-line reason>
Context updated: <each file changed in Step 5.6, with a one-line reason | none>
```

Under the output block, list every `Spec gap:` Assumption, and every Assumption that Step 4.5's triage turned into an assumption instead of a question, one line each, so the user can override any of them before running `execute`. Omit the list when there are none.

If Overall risk (after mitigations) is High, also print the plan's `### Phasing alternative` summary in chat here — that's where the user actually decides, not buried in the file.

**Recommended executor tier** — how capable a model should execute this plan, derived purely from the plan you just wrote (no new investigation): read off the Affected Code table (repo/file count), the Risks table (risk surface), and the Steps (count + additive vs invasive):

- **low** — mechanical, few files, additive, no data-migration / state-transition / security risk, steps fully specified.
- **standard** — moderate: a few domains or repos, some risk, mostly-specified steps.
- **high** — multiple repos with logic changes, security / state transitions / data migrations / cross-service flows, or steps that still need judgment during execution.

Tier, not a model name — map it to whatever model lineup the executor uses. `execute` re-derives this same tier independently, directly from the plan file, and applies it when it runs: under Inline mode it's informational for the user to apply themselves if they want (e.g. via `/model`); under Subagent-Driven mode, `execute` passes a model matching this tier as the `model` argument on each `Agent` dispatch it makes.

Then tell the user the plan is ready — this skill never drives step execution itself, so it never asks the Subagent-Driven-vs-Inline question or touches `## Execution Status` beyond the skeleton it already wrote:

**"Plan saved. Run `/make-it-work:execute <TICKET>` (or `/make-it-work:execute make-it-work/<TICKET>/<TICKET>-plan.md`) when you're ready to implement it — it will ask you to choose Subagent-Driven or Inline execution the first time it runs, and a later re-run picks up wherever the last one left off."**

Leave `## Execution Status` with `Mode: Not yet chosen` and `Progress: Step 0 of <final step count> complete`, set through the status script above. `execute` owns asking for Mode (once, the first time it runs against this plan) and owns updating both Mode and Progress from that point on — `plan-the-work` never edits this section after setting its initial total, except in amend mode below.

**Optional — independent review:** for a high-effort or high-risk plan, offer a fresh-eyes pass that your Step 5.5 self-check can't provide: "I can dispatch a plan-reviewer subagent — fresh context, hasn't seen my reasoning — to pressure-test the plan for gaps and unstated assumptions before you start. Want that?" (autopilot: see Autopilot Mode — declined automatically) (This is the only independent review the plan itself gets; `review-the-code` later reviews the code, not the plan.)

Do not paste the full plan in chat unless the user asks.

---

## When run by implement

When called by `implement`, read this guide before root/spec resolution, readiness inspection, investigation, or writes. Standalone runs skip it. Its initial/replan/amend and caller-owned overrides apply throughout the workflow. Read and follow the complete [Implement integration guide](references/implement-integration.md).
