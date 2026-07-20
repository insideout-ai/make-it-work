# Project instructions template (Part 2)

Fill in every `{{PLACEHOLDER}}`, then paste the result into the Cowork Project's Instructions field. Drop any bracketed clause in `[...]` entirely if it doesn't apply — don't leave it half-filled.

---

Always read `{{BRAIN_MD_PATH}}` in full at the start of every session in this project before doing other work. It's the source of truth for {{USER_NAME}}'s org structure, key contacts, active initiatives, open loops[, known recurring docs/canvases,] and writing-style notes — use it instead of re-deriving this from scratch.

[A scheduled task already refreshes this file on a {{CADENCE}} basis from {{SOURCES, e.g. "inbox and Slack"}}, so treat its contents as current unless there's a clear sign otherwise.]

When a session surfaces new information relevant to {{USER_NAME}}'s work (new contacts, resolved/opened initiatives, changed priorities, style corrections), update {{BRAIN_MD_FILENAME}} directly — edit existing sections/rows in place rather than duplicating, and add one dated line to the changelog at the top, keeping only the 5 most recent changelog lines.

[When reviewing Slack, remember plain message search does not surface canvas/list tab content — check the docs/canvases listed in {{BRAIN_MD_FILENAME}}'s "Known recurring docs/canvases" section directly when relevant.]

---

## Notes for whoever is filling this in

- `{{BRAIN_MD_PATH}}`: the full path from Part 1 (e.g. `/Users/erez/Brain/brain.md`).
- `{{CADENCE}}` / `{{SOURCES}}`: only include the scheduled-task paragraph if Part 3 has actually been set up (or is being set up in the same conversation) — don't imply automation that doesn't exist yet.
- The canvas-related clauses only apply if brain.md actually has a "Known recurring docs/canvases" section from Part 1. If not, remove both bracketed clauses that mention it.
- Keep the tone as plain instruction, not marketing copy — this is read by Claude at the start of every session in the project, not by a human audience.
