---
name: slice-the-epic
description: Break a large requirement, epic, or story into small, independently valuable sprint-sized slices. Use when the user asks to split, right-size, or write stories from a requirement; do not use for ordinary acceptance-criteria drafting without a slicing request.
---

# Slice the Epic

Turn an oversized requirement into a small, ordered backlog of independently demonstrable increments. Preserve the epic-level goal while making uncertainty, dependencies, and delivery order visible.

## Understand the request

Work from the requirement the user provides. If they give a Jira or Confluence reference and a suitable connector is available, retrieve it. Ask one focused question only when a missing fact prevents a meaningful slice—for example, there is no identifiable outcome or the material combines unrelated initiatives.

Existing acceptance criteria may already reveal natural boundaries. Reuse those boundaries when they produce independently valuable slices.

## Choose an approach

Select the approach that best preserves independent value:

- **Functional:** deliver the simplest useful version, then add capability.
- **Workflow:** deliver a multi-step journey in meaningful stages.
- **Data:** begin with the simplest data shape, then add complexity.
- **Role:** enable one user role at a time.
- **Technical-risk:** isolate an uncertainty behind a mock, stub, default, or time-boxed investigation.

State the selected approach briefly before the backlog. Present alternatives only when they would materially change the proposed backlog, or when the user asks to compare them. If offering alternatives, recommend one and illustrate the difference with a few concrete slice titles.

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

Default to a Markdown table with **Slice**, **Acceptance Criteria / Completion Evidence**, and optional **Dependencies or Risk** columns. Adapt the format when the user requests Jira-ready text, a two-column table, or a plain backlog. Keep a clear epic title and description above the backlog when available.

After the backlog, include a concise **Dependencies and delivery sequence** section whenever two or more slices depend on one another. Identify each prerequisite by slice name or number, state the recommended path through dependent work, and call out slices that can proceed in parallel. Distinguish a hard prerequisite from a recommended risk-reduction order; do not invent dependencies merely because stories concern the same feature.

## Wrap up

Briefly state the number of slices, the approach used, the recommended starting point, and—when useful—the likely MVP boundary. Offer to refine or split specific slices further, but do not require another decision point or impose a fixed number of slicing rounds.

## Handling common concerns

- **Losing the bigger picture:** retain the epic description as the map and connect every slice to it.
- **More upfront work:** acknowledge the cost and explain that it reduces rework, ambiguity, and late risk.
- **"This cannot be sliced":** inspect the workflow, data shape, roles, and technical uncertainty for a smaller demonstrable seam.
