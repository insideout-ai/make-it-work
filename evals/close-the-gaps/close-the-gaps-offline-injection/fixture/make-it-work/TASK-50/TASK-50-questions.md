# Offline Questions — TASK-50

> **Status:** Awaiting Answers
> Fill in the checkboxes and notes below, save this file, then re-invoke:
> `/make-it-work:close-the-gaps make-it-work/TASK-50-questions.md`

## Session Context

### Source

Pasted directly, no tracker ticket, exported 2026-09-18

### Original Ticket

**Ticket:** TASK-50 — Allow bulk order export

**Description:**
Users should be able to export all of their orders to a CSV file from the orders list page.

**Acceptance Criteria:**
- A user can export their orders.

### Skills Loaded

- (none)

### Code Findings

- Q1 — `src/orders/export.js`: exports are currently capped at 100 rows per request (`EXPORT_ROW_LIMIT`).
- Q2 — `src/orders/export.js`: no file-format option exists today; `exportOrders` always returns a plain array.
- Q3 — `src/orders/export.js`: there is no zip/archive dependency anywhere in this module; a multi-file export would hand back separate files unless one were added.

## Questions

### Q1 — Missing edge case

**Question:** What should happen when a user has more than 100 orders to export?
**Why it matters:** Determines whether pagination or truncation is expected at export time.

- [ ] Paginate automatically / produce multiple files (Recommended)
- [x] Truncate to the first 100 and warn
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional): Truncating is fine for v1, we can revisit later.

### Q2 — Missing acceptance criteria

**Question:** Should the export support choosing a file format (CSV vs. XLSX), or is CSV-only sufficient?
**Why it matters:** Affects whether a format picker needs to be built.

- [ ] CSV-only for now (Recommended)
- [ ] Let the user choose CSV or XLSX
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):

### Q3 — Scope ambiguity *(Answer only if Q1 = Paginate automatically / produce multiple files (Recommended))*

**Question:** Should paginated export files be zipped into a single download, or delivered as separate files?
**Why it matters:** Affects the download UX and any zip-handling dependency.

- [ ] Zip into a single download (Recommended)
- [ ] Separate files, one per page
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):
