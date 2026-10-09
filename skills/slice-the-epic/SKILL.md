---
name: slice-the-epic
description: Slices a large requirement into small, AI-ready, value-driven slices. Use when the user asks to split, slice, right-size, or write stories from a requirement — including phrasing like "this ticket is too large," "break this into smaller pieces," or "help me write user stories for this epic."
disable-model-invocation: true
---

# Slice the Epic

Turn an oversized requirement into a small, ordered backlog of independently demonstrable increments. Preserve the epic-level goal while making uncertainty, dependencies, and delivery order visible.

## Usage

```
/make-it-work:slice-the-epic [--autopilot] <requirement text | Jira/Confluence reference>
```

- **No `--autopilot`** — interactive. If the requirement is missing an identifiable outcome, or it combines unrelated initiatives, asks one focused clarifying question and waits, exactly as documented below.
- **`--autopilot`** — unattended. If that clarifying question would otherwise fire, apply the Autopilot Mode policy below instead of pausing.

## Autopilot Mode

When invoked with `--autopilot`, still evaluate the "Understand the request" condition exactly as the interactive path would — only skip the pause when the condition is actually met (no identifiable outcome, or unrelated initiatives bundled together).

**Hard-stop exception:** none. This skill reads a requirement and returns a backlog in chat; it never overwrites or discards existing state, so there is no destructive-action analog to guard against. The "Wrap up" step's offer to refine or split slices further is already non-blocking by design — the skill text explicitly says not to require another decision point there — so autopilot makes no change to it.

**Decision log:** after the backlog has been produced — never before it, and never as a reason to delay or withhold the backlog — write `make-it-work/slice-the-epic-autopilot-log.jsonl` at repo root, overwritten fresh for this run (zero lines if the clarifying-question condition never fired). If the write is denied (e.g. a sandboxed environment that blocks decision-log writes), treat that as non-fatal: the backlog has already been delivered, so simply note the failed write in the end-of-run summary instead of stopping or retrying. Field shape follows the shared schema in `docs/autopilot-log-schema.md` — this skill has exactly one possible site, always `kind: "open_text"`, so it omits `multiSelect`/`question`/`options` entirely and `chosen` is always the free-text best-guess answer, prefixed `[autopilot best-guess]` — there is no hard-stop here, so `chosen` never needs the `null` branch. Every line also still includes `rationale` (one sentence explaining the inference), per the shared schema's core fields. `phase` is always `"Understand the request"`; `site` is always `"missing-fact-clarification"`.

When Bash is permitted, use the shared writer in `docs/autopilot-log-schema.md` for the post-deliverable flush only, in its own Bash tool call; never use it to bypass a denied log write.

**Resolution table:**

| Site | `kind` | Autopilot resolution |
|---|---|---|
| Missing-fact clarification (fires only when there is no identifiable outcome, or the material combines unrelated initiatives) | `open_text` | State the best-guess assumption inline, prefixed `[autopilot best-guess]`, and proceed with slicing on that assumption rather than waiting for an answer. |

At the end of an autopilot run, print a short summary: either the one auto-resolved assumption and the log file's path, or a one-line note that no clarifying question was needed this run (and whether the log write itself succeeded).

## Understand the request

Work from the requirement the user provides. If they give a Jira or Confluence reference and a suitable connector is available, retrieve it. Ask one focused question only when a missing fact prevents a meaningful slice—for example, there is no identifiable outcome or the material combines unrelated initiatives. (autopilot: see Autopilot Mode)

On the interactive path, request exactly one fact and then stop. A brief explanation or examples of possible answers are fine, but do not append another request, even as an optional "would also help" sentence. For a vague outcome such as "make the platform better for enterprise customers," ask which specific outcome the epic should deliver; infer secondary details such as the primary user after that answer arrives.

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
