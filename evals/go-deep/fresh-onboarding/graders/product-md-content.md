---
type: llm
focus: { source: file, path: ".claude/rules/product.md" }
weight: 2
---

This file documents a tiny fixture project ("Mini Task Tracker") whose source
code supports three core use cases: (1) creating a task, (2) completing a
task, and (3) receiving a reminder about an overdue task. Its
`src/models/user.js` also implements `createUser`, which may reasonably be
documented as a fourth use case. The architecture may group the small user
model with tasks or describe it as a separate domain.

Judge whether this product.md file satisfies all of the following:

1. It contains a use-case table with columns matching `ID | Use Case | Actor | Trigger | Domains` (or clearly equivalent column headings in that order/intent).
2. The table lists the three core use cases, optionally plus Create User.
   No unrelated or unsupported use case should be added.
3. Every value in the Domains column is a plausible domain for this fixture:
   task management and notifications must be represented; a separate user
   domain is also acceptable. Do not require evidence from architecture.md
   here, since only product.md is supplied to this grader. The separate
   architecture-md-content grader checks that file.

PASS only if all of 1-3 hold.
