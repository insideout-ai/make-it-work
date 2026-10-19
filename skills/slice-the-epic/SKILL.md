---
name: slice-the-epic
description: Slices a large requirement into small, AI-ready, value-driven slices. Use when the user asks to split, slice, right-size, or write stories from a requirement — including phrasing like "this ticket is too large," "break this into smaller pieces," or "help me write user stories for this epic."
disable-model-invocation: true
---

# Slice the Epic

Turn an oversized requirement into a small, ordered backlog of independently demonstrable increments. Let the user choose a slicing approach, then save the full backlog, dependency map, and recommended implementation flow in one Markdown file.

## Usage

```
/make-it-work:slice-the-epic [--autopilot] <requirement text | Jira/Confluence reference>
```

- **No `--autopilot`** — interactive. Ask a focused clarification only when needed, then offer 2–3 slicing approaches and wait for the user's choice before generating stories.
- **`--autopilot`** — unattended. Resolve any necessary clarification and select the recommended slicing approach using the policy below.

## Autopilot Mode

When invoked with `--autopilot`, evaluate the same clarification condition and construct the same approach choices as the interactive path. Resolve those sites without calling `AskUserQuestion` or waiting for an answer.

**Hard-stop exception:** none. This skill saves a fresh timestamped backlog, adding a numeric suffix on a filename collision; it never overwrites an existing backlog. The "Wrap up" offer remains non-blocking.

**Decision log:** after saving the backlog Markdown file, flush accumulated decisions to `make-it-work/slice-the-epic-autopilot-log.jsonl` under the same project root, overwritten fresh for this run. Never delay or withhold the backlog for this log. If the log write is denied, note it as non-fatal in the summary and finish without retrying or switching tools. If saving the backlog itself is denied, provide its complete contents in chat and clearly report that the file was not saved; any decision-log attempt follows delivery of that fallback.

Field shape follows `docs/autopilot-log-schema.md`. Every entry includes `phase`, `site`, `kind`, `chosen`, and a one-sentence `rationale`. Clarification uses `phase: "Understand the request"`, `site: "missing-fact-clarification"`, `kind: "open_text"`, and a free-text `chosen` prefixed `[autopilot best-guess]`; omit question/options fields. Approach selection uses `phase: "Choose an approach"`, `site: "slicing-approach"`, `kind: "askUserQuestion"`, the exact constructed `question` and `options`, `multiSelect: false`, and the chosen Recommended label. It produces a log entry even when no clarification was needed. If the user already supplied a definite approach, do not invent an auto-resolved choice or log entry. This skill uses no `checkpoint` or `chosen: null` branch; a run with no auto-resolved sites writes an empty log.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for the post-deliverable flush only, in its own Bash tool call; never use it to bypass a denied log write.

**Resolution table:**

| Site | `kind` | Autopilot resolution |
|---|---|---|
| Missing-fact clarification (fires only when there is no identifiable outcome, or the material combines unrelated initiatives) | `open_text` | State the best-guess assumption inline, prefixed `[autopilot best-guess]`, and proceed with slicing on that assumption rather than waiting for an answer. |
| Slicing-approach selection (unless the user already chose an approach) | `askUserQuestion` | Present the 2–3 candidate approaches and previews, construct the single-select payload, and pick the option labeled `(Recommended)`. Record that the approach was selected automatically, without implying human approval. |

At the end, summarize the selected approach, any auto-resolved assumption, the backlog file path, and whether the log write succeeded. Preserve any best-guess prefix in the saved artifact's assumptions, and mark its approach selection `_(autopilot)_`.

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

Default to a compact slice index followed by a full section per slice, so stories and multi-scenario acceptance criteria remain readable. Each slice includes its ID and title, story or technical objective, acceptance criteria or completion evidence, and hard prerequisites (IDs or `None`). Adapt presentation when the user requests Jira-ready text, a two-column table, or another format, while retaining every slice's full content in the saved artifact.

## Dependencies and implementation flow

Identify relationships after drafting the slices, then reconcile them with each slice's dependency field:

- **Hard prerequisite:** a slice must finish before another can be implemented or verified. Explain the specific capability, contract, artifact, or decision it supplies. Name external prerequisites explicitly rather than fabricating a story for them.
- **Recommended sequence:** a preferred order to reduce uncertainty or rework, without implying a blocker.
- **Parallel work:** slices with no hard dependency on each other can proceed together once their respective prerequisites are met. Shared subject matter alone is not a dependency.

Always include a **Dependency map** section in the artifact with a Mermaid `flowchart LR` and an accompanying Markdown table: `Predecessor | Successor | Relationship | Reason`. Use every slice as a node, including independent ones. Draw solid arrows from prerequisite to dependent for hard dependencies and dashed arrows labeled `recommended` for preferred sequencing. Include a legend. Use simple Mermaid node identifiers such as `S1`, with labels containing the actual stable ID and a short title. The table must convey the relationships even in viewers that do not render Mermaid. If there are no relationships, state `No inter-slice dependencies identified`; show all nodes without inventing edges, and keep the table empty or use that explicit statement.

Describe the **Recommended implementation flow** as ordered stages or waves. For each, name the slice IDs, why they belong there, what prior work must be complete, and what can run in parallel. Distinguish technical feasibility from preferred risk order; do not assume team staffing or promise calendar dates. Identify a proposed MVP boundary when meaningful (or the first useful technical outcome for remediation work), including the prerequisite closure needed to deliver it.

Before saving, check that every referenced ID exists, story fields and map/table agree, all hard prerequisites precede dependents, and the hard-dependency graph has no cycles. If a cycle appears, revisit the slice boundaries or identify the unresolved contract instead of publishing an impossible sequence. The diagram, dependency table, and implementation flow must describe the same plan.

## Save the Markdown deliverable

Save one new file as `make-it-work/slices-[epic-title-in-kebab-case]-[YYYYMMDD-HHMM].md` under the project root (create `make-it-work/` if needed). Use the current working directory when no repository root is explicitly known; never infer a parent from the home path or a status display. Add a numeric suffix if that filename already exists. Further refinement saves a new version rather than overwriting earlier output unless the user explicitly requests an in-place edit.

The file includes:

1. Epic title, goal, and source reference when available.
2. Selected slicing approach and rationale.
3. Assumptions or open questions, if any.
4. All slices/stories, with their complete acceptance criteria or completion evidence and prerequisite fields.
5. Dependency map (Mermaid plus the relationship table).
6. Recommended implementation stages, parallel opportunities, and proposed MVP or first useful technical outcome.

Use only the provided requirements and clearly identified proposals or assumptions. Do not claim a file was saved unless the write succeeded. If file creation is unavailable or denied, report that limitation and deliver the complete Markdown in chat. Saving the local backlog does not authorize creating external tickets.

## Wrap up

Link the saved file and briefly state the number of slices, approach, recommended starting point, parallel opportunities, and proposed MVP boundary when useful. The artifact contains the full backlog, so the chat summary need not repeat every story. Offer to refine or split specific slices further, but do not require another decision point or impose a fixed number of slicing rounds.

## Handling common concerns

- **Losing the bigger picture:** retain the epic description as the map and connect every slice to it.
- **More upfront work:** acknowledge the cost and explain that it reduces rework, ambiguity, and late risk.
- **"This cannot be sliced":** inspect the workflow, data shape, roles, and technical uncertainty for a smaller demonstrable seam.
