---
name: shape-the-epic
disable-model-invocation: true
description: "Guide a product manager or technical lead through shaping a Product or Technical-debt epic for any work management tool. Select readiness categories, conduct a discovery interview, then generate the complete epic for consolidated review without category-by-category approval."
---

# Shape the Epic

## Role and workflow

Help the user shape an epic for Jira, Azure DevOps, Linear, Shortcut, or another work management tool. Act as a senior product coach in **Product** mode and as an engineering partner in **Technical-debt** mode.

Use five phases: context and focus selection, discovery interview and gap-check, internal analysis, epic generation, and consolidated review. Preserve the interview before drafting: select the review categories and explore the user's problem, intended outcome, evidence, and unresolved decisions. After the interview, generate the complete Markdown epic directly. Do not insert a category-by-category round that shows proposed section content and requests approval. Record real unknowns as scoped open items. A complete draft can contain TBDs and is not automatically approved or ready for implementation.

For `/make-it-work:shape-the-epic --autopilot`, read [references/autopilot.md](references/autopilot.md) before starting and apply its unattended resolution policy to mode selection, category selection, and discovery. Without `--autopilot`, conduct the interview with the user and wait for their answers. Removing the post-interview approval phase does not remove or make the interview opt-in.

Ownership is outside this skill's scope. Do not collect, request, display, infer, or use an Epic owner field. Do not assign responsibility for the epic, criteria, systems, dependencies, handover, maintenance, or follow-up work based on people named in sources. Do not create ownership tables, ownership open items, or ownership readiness blockers. If responsibility is explicitly required as a verifiable acceptance criterion, preserve it narrowly in that criterion only. Product user roles and permissions describe behavior and remain in scope.

There are exactly two modes: Product and Technical debt. Once chosen, read only that mode's reference:

- **Product:** [references/product.md](references/product.md) — category catalog, product requirements, acceptance criteria, and output order.
- **Technical debt:** [references/technical-debt.md](references/technical-debt.md) — problem and evidence, desired outcomes, acceptance criteria, verification, scope boundaries, and optional material constraints.

## Question tool conventions

Use Claude's `AskUserQuestion` when available. Its input is a `questions` array; each question has `question`, `header` (at most 12 characters), `options` (2–4 objects with `label` and `description`), and `multiSelect`.

- Use `multiSelect: false` for mode choice and discovery decisions.
- Use `multiSelect: true` for category selection. The four-option limit still applies.
- Claude automatically provides free-text "Other" input; do not spend an option on a duplicate escape choice.
- If recommending a choice, put it first and append `(Recommended)` to its label. A recommendation does not imply a preselected checkbox; the documented input has no default-selection field.
- If the tool is unavailable, present numbered choices in text. For category selection, ask for all desired numbers, or `all`; for a single-choice question, ask for one number or a written answer. Do not treat displayed Markdown checkboxes as interactive controls.
- Discovery uses one substantive question per turn. The two category-selection questions in Phase 1 are the sole batching exception. Questions gather information and decisions; do not use them to request approval of proposed section drafts.

Tool schema reference: [Claude's question format](https://code.claude.com/docs/en/agent-sdk/user-input#question-format).

## Phase 1 — Context and focus selection

Ask for the working title, a brief description of the problem and intended outcome, and any source materials. Reuse information already supplied rather than asking for it again.

Tell the user:
> Share as much or as little as you have. The more context you provide upfront, the fewer questions I'll need to ask.

Read provided documents and URLs using available tools. If a source is inaccessible, identify the missing evidence and continue with the available material; do not claim to have read it.

### Choose the mode

If the user already specified a mode, use it. Otherwise ask one single-select question:

- **Product:** Shape a feature around user needs, business outcomes, and product behavior.
- **Technical debt:** Shape remediation around system health, engineering cost, risk, and technical outcomes.

If the idea includes both, ask which perspective should lead this epic, then use that mode and retain relevant constraints from the other perspective. Do not introduce a third mode.

Read the selected mode's reference before presenting its categories.

### Choose the categories

If the user explicitly requested a subset or all categories, honor that selection and summarize it. Otherwise present the seven categories from the selected reference as **two multi-select questions in one `AskUserQuestion` call**: IDs 1–4 in the first and IDs 5–7 in the second. Use the catalog's labels and descriptions, including any optional qualification. Keep stable catalog IDs.

Use distinct question texts:
> Which categories should we focus on in group [G] of 2? Select every category you want to review in this group. Unselected categories will be marked Not assessed.

Use headers `Focus 1/2` and `Focus 2/2`. Explain that selecting all categories gives a full review. Do not add All or Skip options to the checkboxes; the built-in free-text answer can express all or none. Combine the selections and state the mode and selected categories. Clarify empty or ambiguous answers; do not infer an omitted answer to mean all. Accept an explicit choice of none in a group. If none are selected overall, ask which category to start with.

Record the selection as the **review scope**. Selecting fewer categories limits the interview and generated substantive sections; it does not exclude omitted work from the epic itself. Label a subset a **Focused review** and preserve agreed content in unselected sections when editing an existing epic. Selecting an optional category permits investigating whether it applies; it does not make its output section mandatory or its omission a readiness gap.

## Phase 2 — Discovery interview and gap-check

### Part A — Discovery interview

Build a concrete shared understanding of the selected areas. Start with one broad question from the selected mode's reference, unless the supplied context already answers it. Follow the most important unresolved thread, resolving dependencies before opening another topic. Avoid presenting section drafts during discovery.

- Ask one question per turn. Prefer the tool when 2–3 plausible answers can be offered; use plain text for genuinely open exploration.
- When a free-text answer changes your understanding materially, reflect it back for confirmation before building on it. Do not require a redundant confirmation after every written answer. This checks understanding during discovery; it is not approval of drafted sections.
- Probe vague statements for the evidence, decision, or constraint needed to make them concrete. Discovery is not limited to questions that block drafting.
- If the user says TBD or undecided, ask what blocks the decision when useful. Respect an explicit choice to defer, record it, and continue.
- Ask about unselected categories only for a specific dependency that prevents a selected category from being understood. Explain the dependency and offer to record it as open or add that category to the review scope. Do not silently expand the interview.
- Reuse answers already supplied, including a completed interview. Do not repeat answered questions or run a fixed questionnaire when the context covers the selected areas.

### Part B — Gap-check

Scan only the selected categories using their mode-specific requirements. Ask a targeted follow-up for missing information that cannot be grounded in the inputs. Respect deferred decisions and the user's available evidence; do not force unknown facts to become answers before drafting.

Ground the draft in available evidence. Distinguish source-supported facts, explicit user decisions, proposed assumptions, and unknowns. Do not invent numerical baselines, targets, architecture, rollout commitments, verification commands, or results.

When the selected areas are understood or unresolved decisions have been recorded, say:
> I have enough context to draft the epic. I'll generate the complete draft now for your consolidated review.

For each open item, state the missing fact or decision and how it affects scope, acceptance, or verification. Do not turn every possible design choice into an open item. Ask about an unselected category only if a specific dependency prevents the requested scope from being understood; otherwise preserve the requested focus.

Maintain a silent running log:

| Entry | Capture | Status |
|---|---|---|
| Decision | Explicit user choice and stated rationale | Confirmed |
| Assumption | Proposed interpretation and supporting context | Proposed |
| Open item | Missing fact or decision and its effect | Open / Deferred |
| Explicit exclusion | What the user excluded from the epic and why | Out of scope |

Source-supported facts are not automatically user-confirmed decisions. Keep optional omissions and unselected categories out of the open-item and exclusion logs unless the user separately deferred a real decision or excluded work.

## Phase 3 — Internal analysis

Check that the draft connects the problem to the intended outcome, expresses testable acceptance criteria, respects scope boundaries, and makes evidence gaps visible. Use the mode's format and the user's words where possible. Resolve contradictions from sources when possible; otherwise identify the precise unresolved decision. Do not draft unselected sections or silently mark them assessed because sources mention them.

## Phase 4 — Epic generation

Read [the epic artifact contract](../../docs/deterministic-artifacts.md#epic-artifacts). After completing the interview and semantic category/readiness decisions, use required `scripts/epic.mjs` rendering/writing for section order, status, scope projection, shared lists, decision ordering and collision-safe files. For revisions pass the prior artifact to preserve unselected/custom sections and retain the full shared decision history. The content and review rules below still apply; a renderer pass does not imply readiness or approval.

Generate the complete draft in the selected mode's output order without a section-approval gate. Preserve supplied commitments and clearly label proposed interpretations. When editing an epic, apply the requested changes and preserve unrelated content, including unselected sections; the ownership prohibition still applies to generated content.

Save a new Markdown file as `make-it-work/epic-[title-in-kebab-case]-[YYYYMMDD-HHMM].md` under the project root (create `make-it-work/` if needed). Use the current working directory as the project root when no repository root is explicitly known; never infer a parent from a home path or status display. Keep the epic and autopilot decision log under the same root. Avoid overwriting an existing file with the same name; append a numeric suffix if needed. Tell the user the saved filename. This workflow generates a local artifact; it does not itself authorize publishing or modifying a work-management ticket.

Start the artifact with its title, **Mode**, **Status: Draft — pending review**, and **Review scope**. Identify the selected categories and list unselected categories as **Not assessed**. For an explicitly requested full review, assess all applicable categories; optional inclusion rules still apply. Do not claim full elaboration readiness based on section coverage alone.

For each included section:

- Use source-supported content and clearly marked proposals. If essential content is missing, state the specific gap rather than filling it with invented facts.
- Place an inline `> Open item: [missing fact or decision and its effect]` beside affected content, and repeat it in the consolidated Open Items list.
- Place explicit epic exclusions inline in the relevant selected section and repeat them in Out of Scope. If no selected section fits, list them only in Out of Scope.
- Wrap Gherkin in `gherkin` fences. Use one space after each keyword, with normal indentation.

Append these sections:

### Open Items & Out of Scope

Use `Open Items (TBD)` and `Out of Scope` subsections. Preserve the user's words when supplied; otherwise describe the evidence gap without fabricating a quotation. Write `None noted.` when empty. Do not add ownership questions, optional omissions, unselected categories, or deferred implementation design to these lists merely to fill a template.

### Readiness checklist

List only assessed, applicable categories as checkboxes. Mark `[x]` when content is concrete, supported, and has no material unresolved decision; leave `[ ]` for unresolved content or unconfirmed assumptions that affect scope, acceptance, or verification. These boxes describe content readiness, not human approval. For a focused review, follow with a separate **Not assessed** list of unselected categories. An omitted optional category is not a blocker and needs no Not applicable approval. Report unresolved open items even when all listed boxes are checked.

### Decision log

Include substantive explicit decisions, proposed assumptions, open/deferred items, and epic exclusions:

| # | Topic | Decision | Rationale | Status |
|---|---|---|---|---|

In autopilot runs, preserve `[autopilot best-guess]` prefixes for inferred answers and append `_(autopilot)_` to straightforward auto-selected decisions; do not reference the run JSONL log from this deliverable table.

Use the user's own words for explicit decisions where possible. Leave rationale blank when none was stated. Do not label a proposal Confirmed without an explicit user decision. Sort Confirmed, Proposed, Open / Deferred, then Out of scope. If no entries exist, write `No decisions recorded.`

## Phase 5 — Consolidated review and revision

After saving the complete draft, invite the user to review the whole artifact and provide consolidated comments. Briefly identify material open decisions. Do not require approval of each section or reopen a confirmation loop after revisions. Apply feedback together, preserve unaffected content, and save the revised artifact with the same collision-avoidance rule. Update assumptions, open items, and readiness to reflect the actual decisions; do not imply approval merely because a revision was requested.

## When the user requests a Jira update

An explicit request to update a Jira ticket authorizes publishing to that specified ticket; do not ask for the same permission again. Generating the local epic or running autopilot alone does not authorize a Jira update.

Use the **entire latest saved epic Markdown** as the ticket description unless the user explicitly requests a narrower edit. Include its title, mode, draft status, review scope, every substantive section, acceptance criteria, Open Items & Out of Scope, Readiness checklist, and **the complete Decision log table, including all rows, rationales, and statuses**. The Decision log is part of the epic, not an internal appendix to discard. Preserve proposed assumptions, deferred decisions, and autopilot markers as written; publishing does not confirm them or change readiness. Adapt formatting to the connector's supported description format without summarizing, truncating, or dropping content.

The separate `shape-the-epic-autopilot-log.jsonl` is a run audit file, not part of the epic Markdown. Do not append or attach it unless the user specifically requests that additional artifact.

Before sending, compare the prepared description with the saved epic to ensure every section and all decision entries are present. After updating, read back the ticket description and verify the same content survived formatting conversion, including the Decision log. If a connector or destination limit prevents a complete update, explain the limitation rather than silently omitting sections or substituting an attachment/comment. Report an incomplete or unverified update accurately, and provide the ticket link and local epic path when available.

## When run by drive-the-epic

Read this section before applying standalone save/log/publication behavior. The parent passes the current autonomy, run name and absolute directory, retained source evidence and references, prior decisions/progress, and its controller path.

Keep this skill's shaping interview, mode/category selection, output content, and autopilot policy. Reuse saved answers. Before each blocking interview question, ask the parent to checkpoint the exact question; after the answer, checkpoint the actual choice before continuing. Report substantive decisions, assumptions, open items, and progress to the parent's decision journal with accurate provenance.

Place this skill’s semantic `epic.mjs` input directly in the parent’s reusable `.event.json` under the event’s `input`; do not save a separate `epic-input` file. Submit it using the parent's `epic` event instead of calling the standalone writer: the parent uses that same writer to save a new epic **inside the run folder**, adds retained source references, updates progress/HTML, and owns the complete-epic review gate. Present the saved complete draft for that gate; do not insert a separate approval loop, publish Jira, or proceed to slicing yourself. Autopilot returns the saved draft immediately to the parent.

Use only the parent’s reusable `.event.json` as temporary input; do not save command results. Instead of this skill’s standalone JSONL log, report each auto-resolved site through the parent’s automatic `decision` event with `stage: shape-the-epic` and the existing shared-schema entry as `auto_resolution`. The complete record is retained in state, without another log file. Existing old logs remain untouched. The parent marks automatic continuation separately from user approval. These orchestration-specific destination, logging, and checkpoint rules replace standalone mechanics only for this invocation.
