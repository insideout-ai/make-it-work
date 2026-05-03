---
description: "Builds a 3-tier doc system (CLAUDE.md, orientation maps, domain & UC skills) for any codebase. Use when onboarding a project to Claude Code or auditing/updating existing docs after the project evolves."
---

Create a 3-tier layered documentation system from scratch. The goal is to keep context concise and well-organized while ensuring the AI agent has all necessary information.

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
After code discovery, ask questions **one at a time** about missing or unclear information. Only ask what couldn't be determined from the code analysis:

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
- **Phase 2 — Targeted Questions:** Ask questions naturally, one at a time, only about information that couldn't be determined from code analysis. Wait for each answer before proceeding to the next question.
- **Phase 3 — Confirm Scope:** Present the identified functional domains and use cases to the user for confirmation before creating any files. Show a draft domain list and UC list. **Checkpoint: user must confirm scope before proceeding.**
- **Phase 4 — Draft Tier 1 + Tier 2:** Before writing any files, use the Task tool to create one task per file (CLAUDE.md, architecture.md, product.md) so progress is visible. Create CLAUDE.md, architecture.md, and product.md, marking each task `in_progress` then `completed` as you go. Then run a cross-tier deduplication pass: scan each section of architecture.md and product.md against CLAUDE.md and flag any content that appears in both. Resolve by keeping actionable "how to" guidance in CLAUDE.md, structural/architectural descriptions in architecture.md, and product/domain content in product.md — delete the duplicate from whichever file it doesn't belong in. **Checkpoint: user reviews the UC table, Functional Domains table, and CLAUDE.md scope before proceeding.**
- **Phase 5 — Create Tier 3 Skills:** Before writing any skills, use the Task tool to create one task per skill file so the full inventory is visible and nothing is missed when running parallel agents. Create 1 sample UC skill + 1 sample domain skill first. **Checkpoint: user reviews depth, structure, and sections.** Incorporate feedback, then create remaining skills in parallel batches, marking each task `completed` when done.
- **Phase 6 — Final Review:** Run cross-reference consistency check and present summary. **Checkpoint: user confirms all cross-references resolve and file inventory is complete.**

**Checkpoint discipline:** Never proceed past a workflow checkpoint without explicit user confirmation.

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
  - **Domain Skills table** — columns: `Skill | Topic | Key code areas`. The "Key code areas" column lists the key directories and files that belong to this domain (e.g., `services/payroll/`, `models/models/payroll-*.ts`), so there is no ambiguity about which skill to load.
  - **Use Case Skills table** — columns: `Skill | Topic | Load when...`. The "Load when..." column provides a specific trigger condition (e.g., "Changing the payroll cycle step transitions") so Claude doesn't load UC skills unnecessarily.
- After Any Feature Change — CRITICAL — a section at the **end** of CLAUDE.md instructing Claude to review whether skill/doc files need updating before every commit. Include:
  - (1) A **Skill docs** checklist step with an explicit update-vs-create distinction:
    - *Fits an existing domain* → update that domain's `.claude/skills/<domain>/SKILL.md`
    - *New domain* (own backend function + distinct component + own data flow with no natural existing home) → **create** a new `.claude/skills/domain-{name}/SKILL.md` AND register it in: the Skills Reference table in CLAUDE.md, the Functional Domains table in `architecture.md`, and the quick-lookup table in CLAUDE.md
  - (2) Additional checklist steps for `product.md`, `architecture.md`, and "commit together"
  - (3) A **quick-lookup table** mapping code areas (directories/file patterns) to which skill file needs updating — one row per existing domain, kept exhaustive as new domains are added
  - (4) A **Planning-time creation trigger**: if the plan introduces a new end-to-end user flow OR a new analytics/feature domain (detectable by: a new backend function, a new UI page/component with its own data flow, or a new route/controller method), the plan must include an explicit task to create the skill file and register it in CLAUDE.md's Skills Reference table, `architecture.md`'s Functional Domains table, and the quick-lookup table. UC-type new flows also register in `product.md`.
  - (5) A **Commit-time creation check**: before committing, if any of the following are new and no skill file exists for them — a backend function, a UI component with its own fetch/data flow, or a user-facing trigger → backend → UI flow — create and commit the skill alongside the code. The lookup table only covers existing domains; this check catches new ones.

**Keep concise:** Aim for under 500 lines. Every sentence should be essential.

**Tier 2 — .claude/rules/ files (always loaded, concise orientation maps)**
Create slim orientation maps. Use tables and bullet lists, avoid prose.

- `.claude/rules/architecture.md`: Service overview table, tech stack table, directory structure tree, context/provider hierarchy, page routing table, backend function groups (tables), functional domains table (domain → key components → key functions), architectural constraints, known technical debt. This is the "what the system looks like" orientation map.
  - **Must include:** Functional Domains table with columns: `Domain | Purpose | Key Components | Key Functions`
  - Reference domain skills: "For detailed domain information, see `/domain-{name}`"
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
  6. **Cross-references** — "Related Domain Skills" linking to `/domain-{name}` (for implementation details), "Related Use Case Skills" linking to `/uc-{id}-{name}`
- **Keep concise:** Aim for 30–50 lines. 500 is a hard max, not a target. Focus on actionable details.
- **Creation method:** Use the Task tool (subagent_type) for each use case skill creation to work in parallel. **Batch into groups of 3–5 parallel agents** if there are more than 6 skills to create.

**Architecture Skills (one per functional domain):**
For each functional domain listed in `.claude/rules/architecture.md`, create a dedicated skill:
- Directory structure: `.claude/skills/domain-{domain-name}/`
- Files: `SKILL.md` only (include examples as an optional "Examples" section within SKILL.md)
- Frontmatter: `name: domain-{domain-name}`, `description: "..."`
- **Description format:** Topic summary followed by a trigger clause: `"[what it covers]. Use when [specific scenarios]."` Stay within 250 characters — Claude truncates beyond that. Front-load the key topic.
- **Prescribed sections for SKILL.md:**
  1. **Summary** (1–2 sentences. State "frontend-only" here if no backend functions, rather than creating empty sections.)
  2. **Data Flows** (bullet-point summaries of the domain's major flows — who calls what, what data moves where. Use 3-5 bullets per flow, NOT ASCII diagrams. Diagrams are reference material that can be derived by reading the code.)
  3. **Domain Validation Rules and Business Logic**
  4. **Entity Schemas** (fields with types — only fields relevant to this domain, not the full entity)
  5. **Formulas / Scoring / Calculation Logic** (if applicable — these ARE the domain knowledge, keep them)
  6. **External API Patterns** (only non-obvious integration details that would cause bugs if missed — e.g., "uses nextPageToken NOT startAt", "JQL must be encodeURIComponent-encoded". Do NOT list standard REST endpoints readable from the code.)
  7. **Backend Functions** (compact table: `Function | Import path | Called from | Key params/returns`. One row per function. Do NOT include code snippets or prose descriptions of what the function does internally — that's in the source file.)
  8. **Cross-references** — "Related Use Case Skills" linking to `/uc-{id}-{name}`, "Related Domain Skills" linking to `/domain-{name}`
- **Section inclusion rule:** Only include sections that have substantive content for this domain. If a domain has no backend functions, no external APIs, or no formulas — omit those sections entirely rather than writing "None" or "N/A".
- **Keep concise:** Aim for 60–120 lines. 500 is a hard max, not a target. Focus on practical implementation details.
- **Creation method:** Use the Task tool (subagent_type) for each domain skill creation to work in parallel. **Batch into groups of 3–5 parallel agents** if there are more than 6 skills to create.


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
   - Must include a "Skills Reference" section listing all available skills (organized by product use cases and architecture domains) with `/skill-name` references
   - Must include "Guidelines and Best Practices" section covering development standards, code style, testing approach, and common patterns
5. **Cross-referencing:**
   - Rules files should reference their corresponding skills using `/skill-name` notation (e.g., `/uc-01-login`, `/domain-auth`)
   - Each skill should cross-reference back to relevant rules files and related skills (both domain and use case) at the bottom of the file
6. **Rules file format:** Keep rules files concise — tables and bullet lists, not prose.
7. **Domain-use case linking:** Use case Domains column must use the same domain names as the Functional Domains table in architecture.md, creating a navigable link between product and architecture.
8. **Skill naming conventions:**
   - Product/use case skills: `uc-{use-case-id}-{use-case-name}` (e.g., uc-01-login)
   - Architecture/domain skills: `domain-{domain-name}` (e.g., domain-auth)
9. **Parallel skill creation:** Use the Task tool (subagent_type) to create each skill in parallel for efficiency. Each task should receive the relevant use case or domain information from the rules files. **Batch into groups of 3–5 parallel agents** if there are more than 6 skills to create, to avoid overwhelming the system.
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
