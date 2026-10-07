---
type: llm
focus: { source: file, path: ".claude/rules/product.md" }
weight: 2
---

This file documents a tiny fixture project ("Mini Task Tracker") whose source
code supports exactly three use cases: (1) creating a task, (2) completing a
task, and (3) receiving a reminder about an overdue task. The architecture
may group the small user model with tasks or describe it as a separate domain.

Judge whether this product.md file satisfies all of the following:

1. It contains a use-case table with columns matching `ID | Use Case | Actor | Trigger | Domains` (or clearly equivalent column headings in that order/intent).
2. The table lists exactly three use cases, corresponding to create/complete/overdue-reminder (wording may differ, but all three concerns must be present — not more, not fewer).
3. Every value in the Domains column names a domain described in the
   architecture file; task management and notifications must be represented.

PASS only if all of 1-3 hold.
