---
type: regex
target: { source: file, path: "CLAUDE.md" }
pattern: "## After Any Feature Change[\\s\\S]*?Before every commit:\\s*[0-9]+\\. \\*\\*Regression status\\*\\*:[\\s\\S]*?[0-9]+\\. \\*\\*Skill docs\\*\\*:"
weight: 3
---

The regression-status item must be the first checklist entry and precede the
existing Skill docs item. Valid runs have used either `0`/`1` or `1`/`2`
numbering; the item order, not the starting number, is the invariant.
