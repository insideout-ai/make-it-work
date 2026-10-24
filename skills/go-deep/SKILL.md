---
name: go-deep
description: "Makes any codebase AI-ready with a 3-tier doc system (CLAUDE.md, orientation maps, domain & UC skills). Use when onboarding a project to Claude Code or auditing/updating existing docs after the project evolves."
disable-model-invocation: true
---

# Go Deep

Create a 3-tier layered documentation system from scratch. The goal is to keep context concise and well-organized while ensuring the AI agent has all necessary information.

## Usage

```
/make-it-work:go-deep [--autopilot]
```

- **No argument** — interactive. Every question and checkpoint below pauses for a human through the question tool policy below.
- **`--autopilot`** — unattended. At every interactive point below, apply the Autopilot Mode policy instead of pausing. Exception: the destructive "Run fresh onboarding" path (see Autopilot Mode) is never auto-selected, even in autopilot mode.

## Questions and Review Checkpoints

**Question tool:** In interactive mode, use `AskUserQuestion` when available and permitted. Otherwise use the host's available, permitted equivalent (e.g. `request_user_input_async`, or `request_user_input` where the active mode allows it). Adapt field names, option limits, and multi-select support to that tool without changing the decision being asked. Never switch modes or request extra permissions just to expose a question tool. For genuinely open-ended questions, use a free-text question tool when supported; otherwise ask in plain text. If no permitted question tool exists, ask in plain text and end the turn awaiting the answer.

**Communication around every question:** Apply this to discovery questions, workflow and repair choices, follow-up questions, and review checkpoints.

- **Before asking:** Present a concise introduction with **What I found/did**, **Your decision**, and **What happens next**. Describe relevant findings or completed work, the specific input needed and why it matters, and what the answer will determine or authorize. Keep simple discovery introductions to two or three sentences; use labeled bullets and the actual tables, samples, or changes for larger reviews. Do not repeat the entire run history.
- **Inside the question:** Include enough context to answer without scrolling: the relevant finding or uncertainty, the decision, and its immediate consequence. Keep option labels short and use descriptions for consequences that differ by choice. Retain any phase-specific review material required below, including Phase 3's complete inventory.
- **After an answer:** Briefly acknowledge its practical effect and state the immediate next action, then proceed within the chosen scope. For example: "I'll document administrators as the only users who can approve payments. Next, I'll confirm the remaining scope." Combine this acknowledgment with the next question's introduction when useful. If the user requests changes or pauses, acknowledge that choice and follow its existing handling below. This adds no questions or approval gates and does not make a discovery answer approve a later checkpoint.
- **Autopilot:** Keep the review material visible and describe resolutions as automatic decisions, never as answers or approvals supplied by the user. Follow the existing resolution and logging policies without asking or waiting.

**Checkpoint interaction:** Use this pattern at every confirmation checkpoint, including Phase 0's file-impact and repair pre-write confirmations:

1. Present the actual review material required by the phase below, with links to any files already written. Counts or statements such as "proposing 2 domains and 4 use cases" do not replace the lists or tables the user must review. State the next action and its impact (e.g. "Next: generate the remaining 14 skills"; for fresh onboarding, name the existing files that will be replaced).
2. Call the question tool with `multiSelect: false`, the checkpoint title and question, and these choices:

   - `{ label: "Approve and continue", description: "Approve the reviewed scope or changes and perform the stated next action." }`
   - `{ label: "Request changes", description: "Revise this checkpoint before continuing." }`
   - `{ label: "Pause here", description: "Stop here and summarize progress for resuming later." }`

   For final acceptance, replace the first label with `Accept documentation` and describe completion rather than another generation step. Do not add a `Skip` or `(Recommended)` label to checkpoint choices.
3. Wait for an explicit response before doing work that depends on approval. A default selection, dismissal, empty response, or elapsed time is not approval. With an asynchronous question tool, keep the checkpoint pending until the user answers. If no question tool is available or permitted, end the turn with a standalone question beginning `Waiting for your confirmation — [checkpoint title]` and list the same choices.
4. On `Request changes`, collect any missing feedback, revise only the current review material, and present the checkpoint again. On `Pause here`, stop and summarize completed work, files written, and the pending checkpoint. Resume from that checkpoint when requested.

The onboarding review titles are **Checkpoint 1 of 4 — Scope**, **Checkpoint 2 of 4 — Foundations**, **Checkpoint 3 of 4 — Samples**, and **Checkpoint 4 of 4 — Acceptance**. Phase 0 uses descriptive titles (`Fresh onboarding — File impact` or `Repair — [action]`) outside this sequence.

## Autopilot Mode

When invoked with `--autopilot`, still **construct** every question/options payload exactly as the interactive path below would — the 2–4 option count, `Use your best judgment` placed last where it applies, and the `(Recommended)` label rules all still apply and get exercised on every run — just don't call any question tool or wait at a checkpoint. Auto-resolve per the table below instead. Keep each site's existing log `kind`: approval sites remain `checkpoint` even though interactive runs now display them through a question tool; genuinely open-ended questions remain `open_text` whether displayed through a tool or plain text.

**Hard-stop exception:** autopilot must never select "Run fresh onboarding" (the path that replaces existing docs wholesale). If that workflow-choice site is reached and "Repair existing docs" isn't a valid option for some reason, stop and require a human rather than proceeding unattended. In practice this exception is never actually triggered by the table below, since the Recommended option at that site is always "Repair existing docs" — but it is a named, explicit rule, not an implicit consequence of always picking the recommended option.

**Decision log:** write `make-it-work/go-deep-autopilot-log.jsonl` at repo root, overwritten fresh at the start of each autopilot run (it describes that run only). Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill uses all three `kind` values (`askUserQuestion`, `checkpoint`, `open_text`), `multiSelect` is a genuine boolean, so `chosen` can be a string, an array of strings, the `open_text` free-text answer, or `null`. No `repo` field — this skill has no per-repo-resolved site. Every line also still includes `rationale` (one sentence), per the shared schema's core fields. `phase` examples: `"Phase 0"`, `"Phase 2"`. `site` examples: `"workflow-choice"`, `"staleness-window"`, `"per-question"`, `"confirm-scope"`.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for this log, invoking each writer command in its own Bash tool call; preserve this skill's timing and never use it to bypass a denied log write.

Append each decision as it is resolved, not at the end. If writing this log is denied, say so in the end-of-run summary and continue the run; never relocate the log.

This file is a run artifact: never add it to CLAUDE.md's Rules Files section, and never let the Phase 4 cross-tier dedup pass touch it.

**Resolution table** (one row per interactive site, in the order they appear):

| Phase | Site | `kind` | Autopilot resolution |
|---|---|---|---|
| Phase 0 | workflow choice (Repair vs Fresh) | `askUserQuestion` | Choose the option labeled `(Recommended)` — today "Repair existing docs". Never choose "Run fresh onboarding" (hard-stop exception above). |
| Phase 0 | fresh-onboarding file-impact confirmation | `checkpoint` | Unreachable under the rule above; if somehow reached, stop and require a human. |
| Phase 0 | repair-action selection, `multiSelect: true` | `askUserQuestion` | Select every surfaced action. |
| Phase 0 | repair-action selection, single-choice + `No repairs now` filler | `askUserQuestion` | Choose the surfaced action, not `No repairs now`. |
| Phase 0 | staleness window | `askUserQuestion` | Choose `30 days`. |
| Phase 0 | repair pre-write confirmation (options 2–4: "confirm with the user" before creating/trimming/updating) | `checkpoint` | Auto-confirm; proceed. Treated as non-destructive and safe to automate — unlike "Run fresh onboarding," these are scoped, git-diffable edits (create a missing file, trim a flagged section, update a stale one), not a wholesale replace. |
| Phase 2 | per-question `AskUserQuestion` | `askUserQuestion` | Choose the option labeled `(Recommended)`. |
| Phase 2 | open-ended question (answer not pre-enumerable) | `open_text` | Answer with your own best inference from Phase 1 code discovery, prefixed `[autopilot best-guess]`. |
| Phase 3 | Confirm Scope checkpoint | `checkpoint` | Auto-confirm; proceed. |
| Phase 4 | UC/Domain/CLAUDE.md review checkpoint | `checkpoint` | Auto-confirm; proceed. |
| Phase 5 | sample-skill review checkpoint | `checkpoint` | Auto-confirm; proceed directly to batch creation. |
| Phase 6 | Final Review checkpoint | `checkpoint` | Auto-confirm; proceed. |

Only the Phase 0 workflow choice and Phase 2 entries carry a `(Recommended)` label in this skill; Phase 0's repair-selection and staleness-window entries don't — do not invent a `(Recommended)` label or a `Use your best judgment` option on those two.

At the end of an autopilot run, print a short human-readable summary of every auto-resolved decision and the log file's path, plus the files written (name the decision log among them when it was written) and any blocked paths (see Write blocked), so someone can audit the run afterward.

## Domain Skill Naming

- Resolve the repository's convention from existing `domain-*` directories and exact skill names referenced in CLAUDE.md and the orientation maps, including references whose files are missing. Preserve those names on repair or repeat onboarding; recreating a missing skill uses its referenced name exactly.
- For a repository with no established domain skill names, use `domain-{id}-{kebab-case-name}`, starting at `01` (e.g. `domain-01-authentication`). Existing repositories with unnumbered domains keep `domain-{kebab-case-name}` for new domains; repositories with numbered domains keep numbering. Do not add a migration choice or rename existing skills to introduce numbering.
- Assign new domain IDs in Phase 3, show the IDs and full skill names in the scope review, and keep them stable. Use at least two digits; allocate above the highest ID already assigned or reserved in the repository's inventory, including missing-skill references. Never renumber existing domains or reuse retired IDs. Domain and UC numbering are independent.
- Carry the same IDs into Phase 4's Domain Skills and Functional Domains tables, adding an `ID` column for numbered repositories. Give Phase 5 agents their assigned full names before parallel creation; agents must not allocate IDs independently.
- Below, `{domain-skill-name}` means the full canonical name resolved here (e.g. `domain-01-authentication`, or `domain-authentication` in an older unnumbered repository). Use it consistently for directories, frontmatter `name`, skill invocations, cross-references, and the quick-lookup table.

## Phase 0 — Prior-Run Detection

Before Phase 1, check whether `go-deep` has already been run in this repo. Any one signal is enough:
- `.claude/skills/` contains a `uc-*` or `domain-*` directory
- `CLAUDE.md` contains go-deep markers (Skill Loading Gate, Skills Reference, or After Any Feature Change sections)
- `.claude/rules/architecture.md` or `.claude/rules/product.md` exists

If none are present, skip to Phase 1 — this is a first run.

If detected, tell the user what evidence was found, then use `AskUserQuestion` with `multiSelect: false` to choose one workflow (autopilot: see Autopilot Mode):

1. `{ label: "Repair existing docs (Recommended)", description: "Preserve the current documentation system and choose only the repairs it needs." }`
2. `{ label: "Run fresh onboarding", description: "Rebuild the documentation system from scratch after reviewing the affected files." }`

If **Run fresh onboarding** is selected, list the existing files that may be replaced or substantially rewritten — `CLAUDE.md`, `.claude/rules/architecture.md`, `.claude/rules/product.md`, and matching `.claude/skills/uc-*` / `.claude/skills/domain-*` files — and require explicit confirmation before modifying anything (autopilot: see Autopilot Mode — this path is never auto-selected). After confirmation, continue at Phase 1 and follow all normal checkpoints. Before rewriting CLAUDE.md, copy any existing `### Other Skills` table and restore it verbatim.

If **Repair existing docs** is selected, check each condition below and surface only the repair actions that are actually relevant. When two or more actions are relevant, present them through `AskUserQuestion` with `multiSelect: true`. When only one action is relevant, use a single-choice question with that action plus `{ label: "No repairs now", description: "Leave the existing documentation unchanged." }` so the tool always receives at least two options (autopilot: see Autopilot Mode).

1. **CLAUDE.md gap** — relevant if CLAUDE.md is missing, or missing any of: Skill Loading Gate, Skills Reference tables, After Any Feature Change section. On selection: add the missing structure immediately.
2. **Missing skills** — cross-reference every `uc-{id}-{name}` / `{domain-skill-name}` named in CLAUDE.md's Skills Reference, product.md's use case table, and architecture.md's Functional Domains table against actual directories under `.claude/skills/`. Ignore Other Skills rows. Relevant if any referenced skill has no matching directory. On selection: list the missing skills, confirm with the user, then create them under their exact referenced names via Phase 5's parallel-agent method.
3. **Non-compliant skills** — skipping `.claude/skills/test-strategy/`, read every existing skill's line count against its size target (UC: 30–50, domain: 60–120, 500 hard max) and scan for signal-to-noise violations (see rule 12 below: ASCII diagrams, code snippets, "None" sections, prop tables, etc.). Relevant if any skill exceeds its target or contains a flagged pattern. On selection: list the flagged skills and violations, confirm with the user, then trim each.
4. **Staleness re-scan** — always relevant when a prior run is detected. Ask the user to pick a window (10/30/60/90 days) via `AskUserQuestion` (autopilot: see Autopilot Mode), then diff commits in that window against each skill's declared code areas (Key Components/Functions in architecture.md, Key code areas in the Skills Reference table; ignore Other Skills rows). Flag skills whose code areas were touched, and record the result in the staleness-window decision's `rationale` (the flagged skills, or that none were flagged). On selection: list flagged skills and the touching commits, confirm with the user, then update each.

**Checkpoint discipline:** Fresh onboarding requires a separate file-impact confirmation before any write. Repair options 2–4 always show what would change and collect explicit confirmation through the checkpoint interaction above before writing any file (autopilot: see Autopilot Mode). Repair option 1 proceeds directly once selected.

## Information Gathering Process

**Phase 1: Code Discovery**
First, analyze the existing codebase to understand what's already there:
- Scan the directory structure to identify main folders and organization
- Read key configuration files (package.json, requirements.txt, etc.) to identify tech stack
- Look for existing documentation (README, docs folders, inline comments)
- Identify main code patterns, components, and modules
- Search for entry points (main.py, index.js, app routes, etc.)
- Find existing use case implementations or feature areas
- Identify domain models, entities, or data structures

**Phase 2: Targeted Questions**
After code discovery, announce how many questions you have. Use the question tool policy above for both multiple-choice and genuinely open-ended questions. Ask only one question at a time, and only about information that could not be determined from code analysis. If there are no unresolved questions, continue directly to Confirm Scope.

Announce first:
> "I've analyzed the codebase and have [N] questions. I'll ask them one at a time."

For each multiple-choice question:
- Call `AskUserQuestion` with:
  - `question`: `"Question [X] of [N] · [Category]: [The question]\n\n[Relevant finding or uncertainty, why this matters, and what the answer will determine.]"` — where `[Category]` is either `Product/domain` (questions 1–10) or `Architecture/technical` (questions 11–20).
  - `options`: 1–3 substantive pre-enumerated choices + always `{ label: "Use your best judgment", description: "Infer an answer from the code and record any remaining uncertainty." }` (last). `AskUserQuestion` requires 2–4 options total; adapt to the host tool's limits. If the answer truly cannot be pre-enumerated, ask one concise free-text question using the question tool policy above.
  - Always recommend one option: place it first and append `(Recommended)` to its label.
  - Never place `Use your best judgment` first — it must always be last. This delegates only this question; it does not approve a later checkpoint.
- Wait for the user's response before calling `AskUserQuestion` for the next question (autopilot: see Autopilot Mode).
- Record each answer (or delegated inference and its uncertainty) before proceeding.

After the last question: "All questions answered. Confirming scope..."

**Product & Domain Questions:**
1. What is the primary purpose/goal of this project? (1-2 sentences) [if not clear from README/docs]
2. Who are the main user types/actors in this system? [if not evident from code]
3. What are the key use cases this application supports? (list them with brief descriptions) [if not explicitly documented]
4. What are the main user journeys or workflows users go through? [if implementation doesn't make it clear]
5. What are the core domain concepts/entities in this product? [ask for clarification on any unclear entities]
6. What are the critical business rules or validation rules users encounter? [if not evident from validation code]
7. What triggers each use case? (user actions, scheduled events, external APIs) [if not clear from implementation]
8. What are the key product features or capabilities? [if features aren't well-defined in code]
9. Are there different user roles with different permissions/capabilities? [if auth/permissions exist but aren't clear]
10. What are the success criteria or outcomes for each major use case? [if not documented]

**Architecture & Technical Questions:**
11. What is the tech stack? [only ask about non-obvious choices or integrations]
12. What are the main functional domains/modules in the codebase? [ask for clarification on unclear domains]
13. What is the directory/folder structure logic? [only if organization isn't self-evident]
14. What are the main development commands? [if not in package.json scripts or Makefile]
15. Are there any critical platform constraints or rules? [if not documented in code/config]
16. What is the testing approach? [if tests exist but approach isn't clear]
17. Are there environment variables that need to be documented? [supplement what's found in .env.example]
18. What are common pitfalls or gotchas developers should know? [developer knowledge not in code]
19. Are there any special import aliases or path configurations? [if not in tsconfig/webpack config]
20. What external services or APIs does the system integrate with? [clarify purpose if integrations exist]

**Instructions:**
- **Phase 1 — Code Discovery:** Start by thoroughly analyzing the codebase
- **Phase 2 — Targeted Questions:** Use the question tool policy above. Ask one at a time, only about information that couldn't be determined from code analysis, and wait for each answer before proceeding.
- **Phase 3 — Confirm Scope:** Before creating any documentation files or opening the approval prompt, render the complete proposed scope in the conversation:
  - **Domains:** a table with `ID` (where numbered), `Domain`, `Purpose`, and `Skill name`, following Domain Skill Naming.
  - **Use cases:** a table with `ID`, `Use Case`, `Actor`, `Trigger`, and `Domains`, using the same domain names as the domain table.
  - Include every proposed domain and use case; counts alone are insufficient. Include the same complete inventory in the question text as compact lists so it remains visible while the user chooses. Preserve IDs, names, domain purposes, full domain skill names, and each use case's actor, trigger, and domain mapping; do not rely on Markdown table rendering inside the question tool.
  - Use **Checkpoint 1 of 4 — Scope** to ask: "Does this domain and use-case list cover the scope you want documented?" Next action: create CLAUDE.md and the two orientation maps. (autopilot: see Autopilot Mode)
- **Phase 4 — Draft Tier 1 + Tier 2:** Before writing any files, use `TaskCreate` to create one progress task per file (CLAUDE.md, architecture.md, product.md) so progress is visible. Create CLAUDE.md, architecture.md, and product.md, using `TaskUpdate` to mark each task `in_progress` then `completed` as you go. Then run a cross-tier deduplication pass: scan each section of architecture.md and product.md against CLAUDE.md and flag any content that appears in both. Resolve by keeping actionable "how to" guidance in CLAUDE.md, structural/architectural descriptions in architecture.md, and product/domain content in product.md — delete the duplicate from whichever file it doesn't belong in. Present the UC table, Functional Domains table, and CLAUDE.md scope at **Checkpoint 2 of 4 — Foundations** and ask: "Are these documentation foundations ready for creating the sample skills?" Next action: create one sample UC skill and one sample domain skill. (autopilot: see Autopilot Mode)
- **Phase 5 — Create Tier 3 Skills:** Before writing any skills, use `TaskCreate` to create one progress task per skill file so the full inventory is visible and nothing is missed when running parallel agents. Create 1 sample UC skill + 1 sample domain skill first. Present both samples for review of depth, structure, and sections at **Checkpoint 3 of 4 — Samples** and ask: "Should I use these two samples as the pattern for the remaining skills?" State the number of remaining skills to generate after approval. (autopilot: see Autopilot Mode) Incorporate feedback, then create remaining skills in parallel batches with the `Agent` tool, using `TaskUpdate` to mark each progress task `completed` when done.
- **Phase 6 — Final Review:** Verify cross-reference consistency and file inventory yourself, resolve any fixable issues, and present the results with any blocked paths or remaining limitations. Use **Checkpoint 4 of 4 — Acceptance** to ask: "Accept the documentation, or request revisions?" Do not ask the user to perform the consistency checks. Acceptance does not turn blocked files or unresolved issues into completed work. (autopilot: see Autopilot Mode)

**Checkpoint discipline:** Use the checkpoint interaction above at every workflow checkpoint; never proceed without explicit user confirmation (autopilot: see Autopilot Mode).

**How to write:** create and change files only with the Write and Edit tools, never with shell redirection, heredocs, `tee`, `cp` or `mv`. The decision-log writer in `docs/autopilot-log-schema.md` is the one exception.

**Write blocked:** if a write is denied or fails (e.g. the environment protects `.claude/`), never retry it through another tool (including Bash) or path, and don't print the file in chat. Keep going: write every file that is still allowed (`CLAUDE.md`, then the `.claude/rules/` files, then each Phase 5 skill) and record each blocked path. The end-of-run summary lists the files written, the blocked paths and the phases (or, on a repair run, the repair actions) completed, and asks the user to re-run after allowing writes there.

## The 3-tier structure to create:

**Tier 1 — CLAUDE.md (always loaded, concise)**
Keep ONLY: project overview (1-2 sentences), development commands, platform rules/constraints, import aliases, styling system, common development task recipes, environment variables, testing notes, logging patterns, common pitfalls, and resource links. This is the "how to develop here" doc.
REMOVE from CLAUDE.md: anything about architecture (tech stack tables, directory structure, provider hierarchies, routing, component lists, function inventories, domain breakdowns) and anything about product (domain stories, use cases, user journeys, validation rules, domain concepts). Those move to Tier 2/3.

**Must include these sections:**
- Project Overview
- Quick Reference (commands, shortcuts)
- Guidelines and Best Practices (development standards, code style, patterns)
- Rules Files (list of all `.claude/rules/*.md` with brief descriptions)
- CRITICAL — Skill Loading Gate (BLOCKING PREREQUISITE) — a hard-gate section placed **before Quick Reference** that instructs the AI to stop and load relevant skills before doing anything else (exploring, planning, reading code). Include: (1) two categories of skills to identify — domain skills (load any touched) vs UC skills (only if the specific flow is being modified); (2) how to invoke via the Skill tool; (3) default for UC skills: skip when in doubt; (4) enforcement note: if Claude finds itself reading files without calling Skill first, it must stop immediately. This overrides all other workflows including plan mode.
- Skills Reference (organized list of all skills, split into two tables):
  - **Domain Skills table** — columns: `Skill | Topic | Key code areas` (prepend `ID` for numbered domains). The "Key code areas" column lists the key directories and files that belong to this domain (e.g., `services/payroll/`, `models/models/payroll-*.ts`), so there is no ambiguity about which skill to load.
  - **Use Case Skills table** — columns: `Skill | Topic | Load when...`. The "Load when..." column provides a specific trigger condition (e.g., "Changing the payroll cycle step transitions") so Claude doesn't load UC skills unnecessarily.
  - It may also hold an `### Other Skills` table (`Skill | Topic | Load when...`) for skills added by other onboarding steps, e.g. `/test-strategy`. go-deep never generates rows in it.
- After Any Feature Change — CRITICAL — a section at the **end** of CLAUDE.md instructing Claude to review whether skill/doc files need updating before every commit. Include:
  - (1) A **Skill docs** checklist step with an explicit update-vs-create distinction:
    - *Fits an existing domain* → update that domain's `.claude/skills/<domain>/SKILL.md`
    - *New domain* (own backend function + distinct component + own data flow with no natural existing home) → **create** a new `.claude/skills/{domain-skill-name}/SKILL.md` AND register it in: the Skills Reference table in CLAUDE.md, the Functional Domains table in `architecture.md`, and the quick-lookup table in CLAUDE.md. Generate this instruction with the repository's actual convention: numbered repositories use `domain-{next-id}-{name}` with the next unused ID above the highest assigned ID, never renumbering existing domains or reusing retired IDs; older unnumbered repositories use `domain-{name}`. The generated CLAUDE.md must state the applicable convention directly so future feature work can follow it without loading go-deep.
  - (2) Additional checklist steps for `product.md`, `architecture.md`, and "commit together"
  - (3) A **quick-lookup table** mapping code areas (directories/file patterns) to which skill file needs updating — one row per existing domain, kept exhaustive as new domains are added
  - (4) A **Planning-time creation trigger**: if the plan introduces a new end-to-end user flow OR a new analytics/feature domain (detectable by: a new backend function, a new UI page/component with its own data flow, or a new route/controller method), the plan must include an explicit task to create the skill file and register it in CLAUDE.md's Skills Reference table, `architecture.md`'s Functional Domains table, and the quick-lookup table. UC-type new flows also register in `product.md`.
  - (5) A **Commit-time creation check**: before committing, if any of the following are new and no skill file exists for them — a backend function, a UI component with its own fetch/data flow, or a user-facing trigger → backend → UI flow — create and commit the skill alongside the code. The lookup table only covers existing domains; this check catches new ones.

**Keep concise:** Aim for under 500 lines. Every sentence should be essential.

**Tier 2 — .claude/rules/ files (always loaded, concise orientation maps)**
Create slim orientation maps. Use tables and bullet lists, avoid prose.

- `.claude/rules/architecture.md`: Service overview table, tech stack table, directory structure tree, context/provider hierarchy, page routing table, backend function groups (tables), functional domains table (domain → key components → key functions), architectural constraints, known technical debt. This is the "what the system looks like" orientation map.
  - **Must include:** Functional Domains table with columns: `Domain | Purpose | Key Components | Key Functions` (prepend `ID` for numbered domains, matching the Domain Skills table)
  - Reference domain skills: "For detailed domain information, see `/{domain-skill-name}`"
  - **Keep concise:** Aim for under 500 lines. Tables and lists only, no detailed explanations.

- `.claude/rules/product.md`: Domain story paragraph, core domain concepts (1-2 sentence definitions each), use cases summary table, user journey summaries (concise UC chains describing common end-to-end flows, e.g., "First-time setup: UC-01 → UC-03 → UC-07"), domain validation rules (bullet lists). This is the "what the product does" orientation.
  - **Use case table columns:** `ID | Use Case | Actor | Trigger | Domains` — the Domains column lists which functional domain(s) from architecture.md are involved (use short domain names matching the Functional Domains table).
  - Reference use case skills: "For detailed use case flows, see `/uc-{id}-{name}`"
  - **Skill naming derivation:** The skill name is formed as `uc-{id}-{kebab-case-name}`, where `{id}` is the zero-padded use case number and `{kebab-case-name}` is the Use Case column value converted to lowercase kebab-case (e.g., "Withdraw Money" → "withdraw-money").
  - **Keep concise:** Aim for under 500 lines. Summaries only, details go in skills.


**Tier 3 — .claude/skills/ (on-demand, loaded when needed)**

**UC vs Domain skill separation rule:**
- A UC skill answers: "What does the user do, and what do they see?"
- A domain skill answers: "How is it built, and where does the code live?"
- If a sentence names a file, a function, a state variable, or a prop — it belongs in the domain skill, not the UC skill.
- Cross-references bridge the two: UC skills point to domain skills for implementation details.

**Product Skills (one per use case):**
For each use case listed in `.claude/rules/product.md`, create a dedicated skill:
- **Naming:** `uc-{id}-{kebab-case-name}` — zero-padded ID + Use Case as kebab-case (e.g., "Withdraw Money" → `uc-01-withdraw-money`). Never just `uc-{id}`.
- Directory structure: `.claude/skills/uc-{id}-{kebab-case-name}/`
- Files: `SKILL.md` only (include examples as an optional "Examples" section within SKILL.md)
- Frontmatter: `name: uc-{id}-{kebab-case-name}`, `description: "..."`
- **Description format:** Topic summary followed by a trigger clause: `"[what it covers]. Use when [specific scenarios]."` Stay within 250 characters — Claude truncates beyond that. Front-load the key topic.
- **Prescribed sections for SKILL.md:**
  1. **Summary** (1–2 sentences)
  2. **Actor & Preconditions**
  3. **Trigger**
  4. **Main Flow** (numbered steps from the user's perspective — what they click, what they see, what changes on screen)
  5. **Alternative / Error Flows** (from the user's perspective — what they see when something goes wrong or takes a different path)
  6. **Cross-references** — "Related Domain Skills" linking to `/{domain-skill-name}` (for implementation details), "Related Use Case Skills" linking to `/uc-{id}-{name}`
- **Keep concise:** Aim for 30–50 lines. 500 is a hard max, not a target. Focus on actionable details.
- **Creation method:** Use the `Agent` tool with `subagent_type` for each use case skill creation. **Batch into groups of 3–5 parallel agents** if there are more than 6 skills to create.

**Architecture Skills (one per functional domain):**
For each functional domain listed in `.claude/rules/architecture.md`, create a dedicated skill:
- **Naming:** Follow Domain Skill Naming and the assigned names in the inventory; fresh repositories use `domain-{id}-{kebab-case-name}` (e.g. `domain-01-authentication`).
- Directory structure: `.claude/skills/{domain-skill-name}/`
- Files: `SKILL.md` only (include examples as an optional "Examples" section within SKILL.md)
- Frontmatter: `name: {domain-skill-name}`, `description: "..."`
- **Description format:** Topic summary followed by a trigger clause: `"[what it covers]. Use when [specific scenarios]."` Stay within 250 characters — Claude truncates beyond that. Front-load the key topic.
- **Prescribed sections for SKILL.md:**
  1. **Summary** (1–2 sentences. State "frontend-only" here if no backend functions, rather than creating empty sections.)
  2. **Data Flows** (bullet-point summaries of the domain's major flows — who calls what, what data moves where. Use 3-5 bullets per flow, NOT ASCII diagrams. Diagrams are reference material that can be derived by reading the code.)
  3. **Domain Validation Rules and Business Logic**
  4. **Entity Schemas** (fields with types — only fields relevant to this domain, not the full entity)
  5. **Formulas / Scoring / Calculation Logic** (if applicable — these ARE the domain knowledge, keep them)
  6. **External API Patterns** (only non-obvious integration details that would cause bugs if missed — e.g., "uses nextPageToken NOT startAt", "JQL must be encodeURIComponent-encoded". Do NOT list standard REST endpoints readable from the code.)
  7. **Backend Functions** (compact table: `Function | Import path | Called from | Key params/returns`. One row per function. Do NOT include code snippets or prose descriptions of what the function does internally — that's in the source file.)
  8. **Cross-references** — "Related Use Case Skills" linking to `/uc-{id}-{name}`, "Related Domain Skills" linking to `/{domain-skill-name}`
- **Section inclusion rule:** Only include sections that have substantive content for this domain. If a domain has no backend functions, no external APIs, or no formulas — omit those sections entirely rather than writing "None" or "N/A".
- **Keep concise:** Aim for 60–120 lines. 500 is a hard max, not a target. Focus on practical implementation details.
- **Creation method:** Use the `Agent` tool with `subagent_type` for each domain skill creation. **Batch into groups of 3–5 parallel agents** if there are more than 6 skills to create.


## Critical rules:
1. **Content conciseness:** Every file should be concise and focused. No redundant information.
2. **ZERO content overlap** between tiers. If it's in a rules file, remove it from CLAUDE.md. If it's in a skill, keep only summary in rules.
3. **File size limits:**
   - CLAUDE.md: under 500 lines
   - Each rules file (architecture.md, product.md): under 500 lines each
   - Each domain skill (SKILL.md): 60–120 lines (500 is hard max, not target)
   - Each UC skill (SKILL.md): 30–50 lines (500 is hard max, not target)
4. **CLAUDE.md structure requirements:**
   - Must include a "Rules Files" section listing all `.claude/rules/*.md` files with brief descriptions
   - Must include a "Skills Reference" section listing all available skills (organized by product use cases and architecture domains) with `/skill-name` references. Keep the Other Skills table if present.
   - Must include "Guidelines and Best Practices" section covering development standards, code style, testing approach, and common patterns
5. **Cross-referencing:**
   - Rules files should reference their corresponding skills using `/skill-name` notation (e.g., `/uc-01-login`, `/domain-01-authentication`; preserve `/domain-auth` in an existing unnumbered repository)
   - Each skill should cross-reference back to relevant rules files and related skills (both domain and use case) at the bottom of the file
6. **Rules file format:** Keep rules files concise — tables and bullet lists, not prose.
7. **Domain-use case linking:** Use case Domains column must use the same domain names as the Functional Domains table in architecture.md, creating a navigable link between product and architecture.
8. **Skill naming conventions:**
   - Product/use case skills: `uc-{use-case-id}-{use-case-name}` (e.g., uc-01-login)
   - Architecture/domain skills: follow Domain Skill Naming — `domain-{id}-{domain-name}` for fresh or already-numbered repositories; preserve `domain-{domain-name}` in existing unnumbered repositories.
9. **Parallel skill creation:** Use the `Agent` tool with `subagent_type` to create each skill in parallel for efficiency. Each agent should receive the relevant use case or domain information from the rules files. **Batch into groups of 3–5 parallel agents** if there are more than 6 skills to create, to avoid overwhelming the system.
10. **Quality over quantity:** Every line should pass the test: "Would removing this cause the AI agent to make mistakes or miss critical information?"
11. **UC/Domain content separation:** UC skills contain only user-facing flow information (what the actor does, what they see, error scenarios from the user's perspective). Implementation details (component file paths, backend function names/signatures, state variables, props, code snippets, formulas) belong exclusively in domain skills. Cross-references in UC skills point to the relevant domain skills for implementation context. This avoids token waste from duplication and keeps maintenance to one location per concern.
12. **Signal-to-noise principle:** A skill should tell the AI agent WHERE things are and HOW they connect — not WHAT the code says. If the AI can learn it by reading the source file, it doesn't belong in the skill. Specifically, do NOT include:
    - ASCII diagrams or flow charts (use bullet summaries instead)
    - Code snippets that duplicate source files (use function signatures in tables)
    - UI/visual descriptions in domain skills ("gold gradient header", "pulsing borders", hex color values, confetti animations) — the AI will see these when reading the component
    - Full arrays, lookup tables, or color mappings copy-pasted from source files — point to the source file instead (e.g., "defined in `LEVELS` array in `UserLevelBadge.jsx`")
    - Prop tables for components (readable from JSDoc/source)
    - "None" sections (e.g., "No backend functions" / "No external API calls") — state "frontend-only" in the summary and omit the empty section
    - Environment variable lists and OAuth scope enumerations (reference material)
    - Token refresh or auth pattern descriptions repeated across every backend function (describe once in the auth domain skill, reference from others)

**Example — good vs bad Data Flows section:**

Good (bullet style, ~5 lines):
```
- **App load:** AuthProvider.checkAppState() → fetch public settings → base44.auth.me() → set user
- **Jira connect:** getJiraAuthUrl() → redirect to Atlassian OAuth → callback → handleJiraCallback() validates CSRF, exchanges code for tokens → auto-select or show JiraSiteSelector
- **Token refresh:** authenticatedJiraFetch() checks expiry → refreshes via Atlassian token endpoint if expired → retries on 401
```

Bad (ASCII diagram, ~20 lines for the same information):
```
App mounts
  └── AuthProvider.checkAppState()
        ├── GET /api/apps/public/.../public-settings/{appId}
        │     ├── 200 → setAppPublicSettings, check token
        │     │         ├── token exists → checkUserAuth()
        │     │         │     ├── base44.auth.me() → setUser, setIsAuthenticated(true)
        ...
```
