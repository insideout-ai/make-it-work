---
type: llm
focus: { source: file, path: ".claude/rules/architecture.md" }
weight: 2
---

This file documents a tiny fixture project ("Mini Task Tracker") whose source
code has task management, notifications, and a small `src/models/user.js`
module. A separate user-model domain is a defensible decomposition, but not
required; the fixture does not prescribe one unique domain boundary.

Judge whether this architecture.md file satisfies all of the following:

1. It contains a "Functional Domains" table with columns matching `Domain | Purpose | Key Components | Key Functions` (or clearly equivalent column headings in that order/intent).
2. The table lists task management and notifications. It may also list one
   user-model/roles domain corresponding to `src/models/user.js`; do not fail
   solely because that third domain is present. No unrelated domains appear.
3. The file uses tables/bullets, not long prose paragraphs.

PASS only if all of 1-3 hold.
