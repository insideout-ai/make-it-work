# Autopilot mode

Apply only when `/make-it-work:shape-the-epic --autopilot` was explicitly invoked. Without that flag, conduct the mode/focus selection and discovery interview with the user. Autopilot resolves those same questions unattended; it does not restore the removed post-interview category-approval phase.

## Mode and review scope

Honor an explicitly requested mode and category subset. Otherwise select the mode best supported by the supplied context; when no evidence distinguishes them, default to Product and identify this as an autopilot assumption. If no subset was requested, select all seven categories of that mode. Construct the two checkbox payloads and record each selection as an array of exact option labels with `multiSelect: true`. Do not add an All option or apply the single-select Recommended rule to checkboxes.

Optional technical-debt categories remain conditional: selecting them permits checking applicability, not inventing constraints or requiring their output sections. Missing title, description, or source material is handled by discovery and explicit open items; it does not introduce an extra checkpoint.

## Interview resolution

Construct each applicable discovery question as the interactive workflow would, but do not call `AskUserQuestion` or wait for a response. Resolve it from the supplied context. Unknown facts remain unknown; an automatic interpretation is a proposed assumption, not a user-confirmed decision.

| Phase | Site | Kind | Resolution |
|---|---|---|---|
| Phase 1 | Mode choice, when not supplied | `askUserQuestion` | Construct Product / Technical debt options; mark the best-supported choice Recommended and select it. Log the rationale and any assumption. |
| Phase 1 | Category selection, when not supplied | `askUserQuestion` | Construct two multi-select questions (4 and 3 options) and select every category. Log each question separately with its exact options and chosen-label array. |
| Phase 2A | Enumerable discovery question | `askUserQuestion` | Construct 2–3 plausible options, mark the best-supported option Recommended, and select it. Does not count against the six-turn cap. |
| Phase 2A | Genuinely open discovery question | `open_text` | Answer from context with an `[autopilot best-guess]` prefix. Counts against the six-turn cap; do not invent evidence or commitments. |
| Phase 2A | Comprehension check after a human free-text correction | — | Unreachable in an unattended run. |
| Phase 2A | No significant open threads remain | — | Proceed to Part B, including immediately after zero turns when supplied context already covers discovery. Do not invent answered questions. |
| Phase 2A | Six self-answered turns reached with open threads | `open_text` | Log `site: "part-a-cap-reached"`, name remaining threads, record them as Deferred in the epic, and proceed to Part B. |
| Phase 2B | Gap-check, at most one question per selected category | `askUserQuestion` or `open_text` | Use the Recommended rule for enumerable choices; otherwise use a prefixed answer grounded in context. Keep unresolved facts as scoped open items. Optional omissions create no gap-check question or blocker. |

An explicitly supplied mode or subset is already resolved and does not need an invented question or log entry. Reuse answers already supplied, including a completed interview. After discovery and gap-check, perform the internal analysis and generate the complete epic directly. Do not construct per-category Accept/Refine/Replace payloads, print proposed sections for approval, or log automatic acceptance of section drafts.

Do not invent numerical baselines, targets, architectural facts, or verification results. Apply the shared prohibition on ownership throughout discovery and drafting. Unknowns remain open and associated readiness checks remain unresolved. Do not label an unattended epic human-approved or fully ready while material items remain unresolved.

## Decision log

Use the epic input's `decisions` list as the single source for both outputs. Each automatic choice or inferred answer is one `{topic, auto_resolution}` row. Its `auto_resolution` is the complete entry defined by [the shared schema](../../../docs/autopilot-log-schema.md); the epic renderer derives the Proposed decision text and rationale from it. Keep explicit user decisions as ordinary Confirmed rows with provenance, and unresolved questions as ordinary Open / Deferred rows. Do not build a second JSONL payload or add inferred answers outside this shared list.

This skill uses `askUserQuestion` and `open_text`, never `checkpoint`. Each resolution includes `phase`, `site`, `kind`, `chosen`, and `rationale`. Question entries include the exact `question`, `options`, and `multiSelect`: true with chosen-label arrays for focus selection, false with a string for single choices. Open-text answers use a best-guess-prefixed string and omit question/options fields. There are no section-approval entries.

Save the epic with `epic.mjs write` using that input. Then, in its own Bash call, run the existing log writer on the **same input file**:

```sh
node "<skill-dir>/../../scripts/decision-log.mjs" write shape-the-epic --root "<project-root>" --input "<epic-input.json>"
```

Before saving the epic, check every automatically inferred answer and choice,
including gap-check assumptions. Each must have its own `auto_resolution` in the
shared epic input; a plain Proposed row with a best-guess marker is incomplete.
The epic and log writers reject orphaned automatic markers so they cannot save
an epic while silently omitting its inferred decisions from the audit. Correct
the shared input and retry validation; do not remove a marker to hide an automatic
inference or label it as a user-confirmed fact. Ordinary explicit user decisions
retain their provenance and do not need invented automatic resolutions.

The writer extracts every `auto_resolution`, writes the log at `make-it-work/shape-the-epic-autopilot-log.jsonl`, deletes the temporary input, and returns the saved path. No automatic resolutions means an empty log. Keep payload edits and cleanup outside the writer call. Saving the epic takes priority; if the log write is denied, report it as non-fatal without retrying or switching tools. If Bash is unavailable, use one Write call for the log derived from those same nested entries. Never write the log through shell redirection.

Phase 4 creates a new epic, adding a numeric suffix if a timestamped filename already exists. This does not grant permission to overwrite an existing epic or publish a ticket. There is no destructive hard-stop site and no need for `chosen: null`.

## Marking and summary

In the epic's Decision Log, preserve `[autopilot best-guess]` for inferred answers and append `_(autopilot)_` for straightforward automatic selections. Mark inferred substantive content Proposed, not Confirmed. The run JSONL is an audit artifact, not a decision in the epic's table.

After saving the epic and attempting the log flush, report the artifact path, material assumptions, and open decisions. Summarize actual automatic decisions and print the discovery exit using one of these forms:

```text
Part A: [N] self-answered turn(s) used (cap 6); exit: early (no open threads remaining)
Part A: [N] self-answered turn(s) used (cap 6); exit: cap-reached (open threads: [list])
```

For an already sufficient brief, explicitly use the zero-turn form: `Part A: 0 self-answered turns used (cap 6); exit: early (the brief already covered the discovery interview)`. Do not omit the exit reason merely because the count is zero.

Count only Phase 2A `open_text` answers toward Part A's six-turn cap. Report Part B gap-check resolutions separately; a zero-turn Part A can coexist with later gap-check assumptions and unresolved draft items. Explain that distinction when it applies, so “no open threads remaining” describes the discovery interview rather than claiming the entire epic has no open decisions.

Use the writer's successful `Decision log saved to <path>` output to report `Decision log: saved to <path>`. If denied, state `Decision log: write denied — run details are in this summary instead`; report other failures accurately. Invite consolidated feedback on the generated epic without claiming section approvals.
