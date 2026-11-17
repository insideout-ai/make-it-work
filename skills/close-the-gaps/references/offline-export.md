<!-- Procedures relocated from the parent SKILL.md without policy changes. -->

Read this guide only at the loading point in [the skill entrypoint](../SKILL.md). `<base>` and bare relative paths in prose or code below refer to the parent skill directory; Markdown links resolve from this file. Phase and step names refer to the complete workflow in that entrypoint and its linked guides.

### Phase 5B — Offline Export

Build the **complete** question list up front — every wave, not just Wave 1 — since there is no live back-and-forth to reveal later waves incrementally:

1. Compute Wave 1 exactly as in Phase 5A.
2. For each question, enumerate every later-wave question that depends on it, for each of its own options, **recursively** — a question two or three waves deep (e.g. a chain like Trigger → Detect → Reinvoke) is still written out, chained through its own immediate gating question rather than only checked against Wave 1. Write each dependent question directly after the question it depends on, so the file's order always presents a gating question before anything conditioned on it. Label each with the exact condition under which it applies (see template below). If a later question's wording or options cannot be enumerated without an answer that doesn't exist yet (e.g. it depends on free text with no fixed set of branches), do not force it into the file — record it instead under a `## Follow-up Needed After This Round` section at the end of the file, in plain language; Phase 5C resolves it live rather than exporting a second file.
3. Do not call `AskUserQuestion`. Do not ask anything in chat.

Write the file to `make-it-work/<TICKET-or-slug>/<TICKET-or-slug>-questions.md` (the same base name Phase 1 derived and Phase 6 will use), using this template:

```markdown
# Offline Questions — <TICKET-or-slug>

> **Status:** Awaiting Answers
> Fill in the checkboxes and notes below, save this file, then re-invoke:
> `/make-it-work:close-the-gaps <this file's path>`

## Session Context

### Source

<"Fetched from <tracker> issue <ID>" or "Pasted directly, no tracker ticket">, exported <YYYY-MM-DD>

### Original Ticket

<the full ticket content exactly as ingested in Phase 1>

### Skills Loaded

- <skill name> — <one-line reason it was loaded>

### Code Findings

- Q1 — `<path/to/file>`: <one-sentence summary of the Phase 3 finding this question is based on>

### Related Channel Context

<Optional: research choice, scope, queries, retrieval date, outcome, concise
findings and actual Slack message links. Preserve conflicts as unresolved.
Omit for older sessions with no recorded context; this is not the PM delivery block.>

## Questions

### Q1 — [Gap type]

**Question:** <question text>
**Why it matters:** <one sentence>

- [ ] <Option 1 label> (Recommended)
- [ ] <Option 2 label>
- [ ] <Option 3 label>
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):

### Q2 — [Gap type] *(Answer only if Q1 = <option label>)*

**Question:** <question text>
**Why it matters:** <one sentence>

- [ ] <Option 1 label> (Recommended)
- [ ] <Option 2 label>
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):

### Q3 — [Gap type] *(open-ended — no fixed options)*

**Question:** <question text>
**Why it matters:** <one sentence>

**Your answer:**

## Follow-up Needed After This Round

<!-- Omit this section entirely if every question could be enumerated above. -->
- <plain-language description of the gap that could not be phrased as a conditional question, and why>
```

Tell the user: "Questions exported to `<path>`. Answer them there, then re-invoke `/make-it-work:close-the-gaps <path>` to continue." Stop here — do not proceed to Phase 6 in this session.

