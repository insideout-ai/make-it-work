---
name: slice-the-epic
description: Slices a large requirement into small, AI-ready, value-driven slices. Use when the user asks to split, slice, right-size, or write stories from a requirement — including phrasing like "this ticket is too large," "break this into smaller pieces," or "help me write user stories for this epic."
disable-model-invocation: true
---

# Slice the Epic

Turn an oversized requirement into a small, ordered backlog of independently demonstrable increments. Let the user choose a slicing approach, then save a shared Markdown overview and a separate Markdown file per slice under `make-it-work/`. In interactive mode, offer optional Jira Story/Task creation when a suitable integration is available.

## Usage

```
/make-it-work:slice-the-epic [--autopilot] <requirement text | Jira/Confluence reference>
```

- **No `--autopilot`** — interactive. Ask a focused clarification only when needed, then offer 2–3 slicing approaches and wait for the user's choice before generating stories. Save all Markdown deliverables before offering Jira creation.
- **`--autopilot`** — unattended. Resolve any necessary clarification and select the recommended slicing approach using the policy below. Save the overview and individual slice files; skip Jira creation and Jira questions.

## Autopilot Mode

When invoked with `--autopilot`, evaluate the same clarification condition and construct the same approach choices as the interactive path. Resolve those sites without calling `AskUserQuestion` or waiting for an answer. When choosing an approach, first send a chat preview of every candidate with its fit, tradeoff and 2–3 example slice titles, then announce the automatic selection and generate/save the backlog. Autopilot skips the wait, not this preview; an approach section inside the saved backlog or decision log does not replace the preceding chat message.

**Hard-stop exception:** none. This skill saves a fresh timestamped set of overview and slice files, adding a numeric suffix on a filename collision; it never overwrites an earlier set. Skip Jira creation, native dependency links, and the associated source-ticket summary comment even if an integration is available: do not offer creation, ask for Jira values, create tickets or links, or post comments in autopilot. Reading a supplied Jira source remains allowed. The "Wrap up" offer remains non-blocking.

**Decision log:** after saving the overview and every slice file, flush accumulated decisions to `make-it-work/slice-the-epic-autopilot-log.jsonl` under the same project root, overwritten fresh for this run. Never delay or withhold the deliverables for this log. If the log write is denied, note it as non-fatal in the summary and finish without retrying or switching tools. If any deliverable write is denied, provide the missing content in chat and clearly distinguish saved files from unsaved ones; any decision-log attempt follows delivery of that fallback.

Field shape follows `docs/autopilot-log-schema.md`. Every entry includes `phase`, `site`, `kind`, `chosen`, and a one-sentence `rationale`. Clarification uses `phase: "Understand the request"`, `site: "missing-fact-clarification"`, `kind: "open_text"`, and a free-text `chosen` prefixed `[autopilot best-guess]`; omit question/options fields. Approach selection uses `phase: "Choose an approach"`, `site: "slicing-approach"`, `kind: "askUserQuestion"`, the exact constructed `question` and `options`, `multiSelect: false`, and the chosen Recommended label. It produces a log entry even when no clarification was needed. If the user already supplied a definite approach, do not invent an auto-resolved choice or log entry. This skill uses no `checkpoint` or `chosen: null` branch; a run with no auto-resolved sites writes an empty log.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for the post-deliverable flush only, in its own Bash tool call; never use it to bypass a denied log write.

**Resolution table:**

| Site | `kind` | Autopilot resolution |
|---|---|---|
| Missing-fact clarification (fires only when there is no identifiable outcome, or the material combines unrelated initiatives) | `open_text` | State the best-guess assumption inline, prefixed `[autopilot best-guess]`, and proceed with slicing on that assumption rather than waiting for an answer. |
| Slicing-approach selection (unless the user already chose an approach) | `askUserQuestion` | Present the 2–3 candidate approaches and previews, construct the single-select payload, and pick the option labeled `(Recommended)`. Record that the approach was selected automatically, without implying human approval. |

At the end, summarize the selected approach, any auto-resolved assumption, the overview and slice file paths, and whether the log write succeeded. State that Jira creation was skipped in autopilot. Preserve any best-guess prefix in the saved overview's assumptions, and mark its approach selection `_(autopilot)_`.

Non-blocking details the requirement leaves open (for example, a range cap or a file format) go in an **Open questions** list after the backlog. They are not auto-resolved assumptions: do not label them "Assumption" or mention them in this summary.

## Understand the request

Work from the requirement the user provides. If they give a Jira or Confluence reference and a suitable connector is available, retrieve it. Ask one focused question only when a missing fact prevents a meaningful slice—for example, there is no identifiable outcome or the material combines unrelated initiatives. (autopilot: see Autopilot Mode)

On the interactive path, request exactly one fact and then stop. A brief explanation or examples of possible answers are fine, but do not append another request, even as an optional "would also help" sentence. For a vague outcome such as "make the platform better for enterprise customers," ask which specific outcome the epic should deliver; infer secondary details such as the primary user after that answer arrives.

Existing acceptance criteria may already reveal natural boundaries. Reuse those boundaries when they produce independently valuable slices.

## Choose an approach

Build 2–3 tailored candidate approaches from the techniques below. An option may combine techniques when that produces a useful delivery strategy:

- **Functional:** deliver the simplest useful version, then add capability.
- **Workflow:** deliver a multi-step journey in meaningful stages.
- **Data:** begin with the simplest data shape, then add complexity.
- **Role:** enable one user role at a time.
- **Technical-risk:** isolate an uncertainty behind a mock, stub, default, or time-boxed investigation.

Before generating the full backlog, show each candidate's technique or combination, why it fits this epic, the main tradeoff, and 2–3 example slice titles. Make the options meaningfully different in boundaries, order, or feedback opportunities; do not add a weak third choice merely to fill a slot. Recommend one based on independent value, manageable scope, dependencies, and early risk reduction.

Ask the user to choose through `AskUserQuestion`: one question in the `questions` array, a short `header` such as `Slicing`, `multiSelect: false`, and 2–3 options with `label` and `description`. Put the recommended option first with `(Recommended)` in its label. Claude supplies a free-text Other choice automatically. If the tool is unavailable, show numbered options and wait for a number or written choice. In interactive mode, stop here until the user responds; previews are not the completed backlog. In autopilot, apply the resolution table instead.

If the user already specified a definite approach, honor it and briefly state its implications rather than asking them to select again. If they request a custom combination, clarify only material ambiguity, then use that choice. Record the chosen technique(s) and rationale in the final artifact. Do not add a second approval gate before saving the backlog.

## Make slices thin and valuable

Aim for work comfortably completable within the team's normal story-size expectations. When team context is unavailable, use half a sprint as a default heuristic. Split further when risk, uncertainty, dependencies, or implementation complexity make the item difficult to estimate or demonstrate. Do not combine independently testable rules, distinct high-risk decisions, or different release controls merely to reduce the number of slices; prefer a coherent set of thin stories over a smaller story count.

Each slice should produce something a stakeholder can see or use and respond to. Avoid leading with plumbing-only work: pair an enabler with the smallest real outcome it supports. A slice need not be independently releasable, but it should enable feedback that informs the next increment.

Order slices deliberately. Put a prerequisite first when necessary, then bring the riskiest unresolved work forward. Explain when dependency order and risk order differ.

## Write the backlog

For user-facing work, write each slice as a user story with Gherkin acceptance criteria:

```markdown
**As a** <human role>,
**I want** <goal>,
**so that** <outcome>.

- **Given** <context>
  **When** <action>
  **Then** <outcome>
```

Include edge cases as additional Given/When/Then scenarios or as their own slice when substantial. Do not put important behavior in a separate notes or edge-cases section.

For technical enablers or research work with no meaningful human actor, use a concise technical task or time-boxed spike instead. State the outcome it enables and the evidence or decision it must produce; do not invent a human user merely to fit the user-story template.

Assign stable IDs (`S-1`, `S-2`, ...) to every story, technical task, and spike. Use those same IDs in all dependency fields, maps, and implementation stages. Keep a clear epic title and description above the backlog.

Use the **Slice summary** table described below as the shared overview's slice index, linking each stable ID to its individual Markdown file. Each slice file includes its ID and title, epic/source context, a link back to the overview, story or technical objective, complete acceptance criteria or completion evidence, and hard prerequisites (IDs or `None`, with links to prerequisite slice files). Retain the full content in each slice file even when adapting presentation to a requested format; the overview need not duplicate it.

## Dependencies and implementation flow

Identify relationships after drafting the slices, then reconcile them with each slice's dependency field:

- **Hard prerequisite:** a slice must finish before another can be implemented or verified. Explain the specific capability, contract, artifact, or decision it supplies. Name external prerequisites explicitly rather than fabricating a story for them.
- **Recommended sequence:** a preferred order to reduce uncertainty or rework, without implying a blocker.
- **Parallel work:** slices with no hard dependency on each other can proceed together once their respective prerequisites are met. Shared subject matter alone is not a dependency.

Always include a **Dependency map** section in the shared overview with a Mermaid `flowchart LR` and an accompanying Markdown table: `Predecessor | Successor | Relationship | Reason`. Use every slice as a node, including independent ones. Draw solid arrows from prerequisite to dependent for hard dependencies and dashed arrows labeled `recommended` for preferred sequencing. Include a legend. Use simple Mermaid node identifiers such as `S1`, with labels containing the actual stable ID and a short title. The table must convey the relationships even in viewers that do not render Mermaid. If there are no relationships, state `No inter-slice dependencies identified`; show all nodes without inventing edges, and keep the table empty or use that explicit statement.

Describe the **Recommended implementation flow** as ordered stages or waves. For each, name the slice IDs, why they belong there, what prior work must be complete, and what can run in parallel. Distinguish technical feasibility from preferred risk order; do not assume team staffing or promise calendar dates. Identify a proposed MVP boundary when meaningful (or the first useful technical outcome for remediation work), including the prerequisite closure needed to deliver it.

Before saving, check that every referenced ID exists, story fields and map/table agree, all hard prerequisites precede dependents, and the hard-dependency graph has no cycles. If a cycle appears, revisit the slice boundaries or identify the unresolved contract instead of publishing an impossible sequence. The diagram, dependency table, and implementation flow must describe the same plan.

## Slice summary

Generate one compact Markdown table covering **every slice**, including independent slices, with these columns:

| Slice | Summary / outcome | Hard prerequisites | Recommended after | Stage |
|---|---|---|---|---|

Link the stable ID in **Slice** to its individual file. Keep **Summary / outcome** concise and descriptive. List prerequisite slice IDs and any named external prerequisites in **Hard prerequisites**, or `None`. Put optional preferred predecessors in **Recommended after**, or `None`; these are sequencing advice, not blockers. Use the stage from the recommended implementation flow, with the same stage for slices that are recommended to proceed together. Do not invent a dependency merely to fill a cell or imply that recommended stages are mandatory barriers.

Save this table under **Slice summary** in the shared overview Markdown; a separate summary-only file is unnecessary. Show the same rows, IDs, dependency values, and stages directly in the terminal/chat response after generation, before any optional Jira offer. Include the table in the final response too if Jira work leads to a separate completion message. File links may use the display environment's supported paths. A file link, Mermaid diagram, relationship-only table, or tool-call output alone does not replace the visible slice summary. Apply this in both interactive and autopilot runs, including for slices with no dependencies.

Check that the terminal summary and saved table agree with the individual prerequisites, dependency map/table, and implementation flow. If saving is denied, still show the summary and report that the Markdown was not saved, alongside the existing complete-content fallback.

## Save the Markdown deliverables

Save a new set of files directly under the project root's `make-it-work/` subdirectory (create it if needed):

- Shared overview: `slices-[epic-title-in-kebab-case]-[YYYYMMDD-HHMM].md`.
- One file per slice: `slices-[epic-title-in-kebab-case]-[YYYYMMDD-HHMM]-S-1-[slice-title-in-kebab-case].md`, substituting each slice's stable ID and title.

Use the current working directory when no repository root is explicitly known; never infer a parent from the home path or a status display. Choose a common run prefix before writing; if any target filename already exists, add a numeric suffix to that prefix for the entire set. Use relative Markdown links between the overview and slice files. Further refinement saves a new set rather than overwriting earlier output unless the user explicitly requests an in-place edit.

The shared overview includes:

1. Epic title, goal, and source reference when available.
2. Selected slicing approach and rationale.
3. Assumptions or open questions, if any.
4. The **Slice summary** table, linking every stable slice ID to its complete file and showing its summary/outcome, hard prerequisites, recommended predecessors, and implementation stage.
5. Dependency map (Mermaid plus the relationship table).
6. Recommended implementation stages, parallel opportunities, and proposed MVP or first useful technical outcome.

Each slice file contains the full content described in **Write the backlog**, so it can be read and refined on its own. Check that every local link resolves, every slice has a file, and the dependency fields, map/table, and implementation stages agree before reporting the set as complete.

Use only the provided requirements and clearly identified proposals or assumptions. Do not claim a file was saved unless the write succeeded. If a write is unavailable or denied, report which files were saved and deliver the missing Markdown in chat; do not claim the set is complete or proceed to the optional Jira step until local delivery is complete. Saving local files does not authorize creating external tickets.

## Optional Jira creation

In interactive mode, after saving the complete local set, follow [references/jira-creation.md](references/jira-creation.md) to offer Jira creation, propose Story/Task types and optional source-Epic parenting, resolve mandatory values, and report confirmed results. Include native **blocks / is blocked by** links for the planned hard dependencies in the concrete creation offer, showing their direction and count. After approval and ticket creation, create those links between resolved slice tickets; recommended sequencing never becomes a blocking link. Reuse authorization that already covers links, including an explicit user request to add them; do not expand earlier creation-only consent silently.

When the user approves creating the slice tickets as children of the supplied source Jira ticket, also post the **entire saved overview** as a comment there after the ticket and link attempts. Include the summary table, dependency diagram and legend, relationship table, implementation flow, assumptions/open questions, MVP boundary, creation/link results, and any additional sections. **Convert the Mermaid diagram into a readable plain-text dependency list for the comment**, preserving every node, hard edge, recommended edge, and their meanings; retain Mermaid in the local Markdown. The creation-under-source offer includes this full-overview comment, so do not add a second comment approval. Supplying a source ticket or generating slices alone does not authorize a comment. Creation elsewhere, declined creation, or unresolved parenting does not trigger it. If creation is declined or unavailable, finish with the local links and state that no Jira tickets were created. Jira failures do not invalidate the saved backlog.

In autopilot, skip this step entirely, including dependency links and the source summary comment, and state that Jira creation, linking, and commenting were skipped. Do not load the Jira reference or ask Jira questions in that mode.

## Wrap up

Include the complete **Slice summary** table directly in the terminal/chat completion response and link the shared overview containing the same table. Briefly state the number of slices, approach, recommended starting point, parallel opportunities, and proposed MVP boundary when useful. After Jira creation, also include the complete created-ticket list and report failed, pending, or uncertain slices as required by the Jira reference. Report native dependency-link results (created, already present, failed, pending, or uncertain) and the source summary comment separately, with links when available. Otherwise state whether Jira creation was declined, unavailable, or skipped in autopilot. The files contain the full stories, so the chat summary need not repeat their detailed criteria. Offer to refine or split specific slices further, but do not require another decision point or impose a fixed number of slicing rounds.

## Handling common concerns

- **Losing the bigger picture:** retain the epic description as the map and connect every slice to it.
- **More upfront work:** acknowledge the cost and explain that it reduces rework, ambiguity, and late risk.
- **"This cannot be sliced":** inspect the workflow, data shape, roles, and technical uncertainty for a smaller demonstrable seam.
