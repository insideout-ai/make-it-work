---
tags: [close-the-gaps, smoke]
allowed_tools: [Read, Glob, Grep, Write, Edit, AskUserQuestion]
max_turns: 30
timeout_seconds: 600
runs: 1
---

/make-it-work:close-the-gaps

**Ticket:** TASK-77 — Add refund support for orders

**Description:**
When a customer requests a refund, the admin should mark the order as refunded. Refunded orders must no longer appear in the active orders list.

**Acceptance Criteria:**
- Orders can be refunded.
- Refunded orders are shown separately from active orders.
