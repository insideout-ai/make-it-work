# Offline Questions — TASK-99

> **Status:** Awaiting Answers
> Fill in the checkboxes and notes below, save this file, then re-invoke:
> `/make-it-work:close-the-gaps make-it-work/TASK-99-questions.md`

## Session Context

### Source

Pasted directly, no tracker ticket, exported 2026-09-20

### Original Ticket

**Ticket:** TASK-99 — Allow bulk order export

**Description:**
Users should be able to export all of their orders at once.

**Acceptance Criteria:**
- A user can export their orders.

### Skills Loaded

- (none)

### Code Findings

- Q1 — `src/orders/export.js`: SENTINEL-MUST-SURVIVE-UNCHANGED — exports are currently capped at 100 rows per request (`EXPORT_ROW_LIMIT`).

## Questions

### Q1 — Missing edge case

**Question:** What should happen when more than 100 orders match the export filter?
**Why it matters:** Determines whether pagination or truncation is expected.

- [ ] Paginate automatically (Recommended)
- [ ] Truncate to the first 100 and warn
- [ ] Other: ______________________
- [ ] Skip — decide later (TBD)

Notes (optional):
