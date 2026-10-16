---
type: regex
target: { source: file, path: "CLAUDE.md" }
pattern: "regression/coverage status[^\\n]*before committing"
match: not_contains
weight: 2
---

The old "check regression status before commit" checklist item is gone. The
pattern is anchored on that item's own wording, because the fixture's
Guidelines section keeps an unrelated "Run `npm test` before committing." line
that the skill must leave alone.
