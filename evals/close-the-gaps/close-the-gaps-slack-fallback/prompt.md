---
tags: [close-the-gaps]
allowed_tools: [Read, Glob, Grep, Write, Edit, AskUserQuestion]
max_turns: 60
timeout_seconds: 900
runs: 1
---

/make-it-work:close-the-gaps --slack --autopilot

**Ticket:** TASK-60 — Let users export orders for a date range

**Description:**
Users should be able to export their orders for a chosen date range, in a format they pick.

**Acceptance Criteria:**
- Users can choose a start and end date.
- The export contains only orders in that range.
