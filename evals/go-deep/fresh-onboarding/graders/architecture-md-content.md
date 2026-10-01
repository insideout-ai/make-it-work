---
type: llm
focus: { source: file, path: ".claude/rules/architecture.md" }
weight: 2
---

This file documents a tiny fixture project ("Mini Task Tracker") whose source code has exactly two functional domains: task management (creating and completing tasks) and notifications (reminding about overdue tasks).

Judge whether this architecture.md file satisfies all of the following:

1. It contains a "Functional Domains" table with columns matching `Domain | Purpose | Key Components | Key Functions` (or clearly equivalent column headings in that order/intent).
2. The table lists exactly two domains, corresponding to task management and notifications (names may differ from "tasks"/"notifications" but must clearly correspond to those two concerns — not more, not fewer).
3. The file uses tables/bullets, not long prose paragraphs.

PASS only if all of 1-3 hold.
