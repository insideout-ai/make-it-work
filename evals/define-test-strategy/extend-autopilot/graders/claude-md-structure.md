---
type: regex
target: { source: file, path: "CLAUDE.md" }
pattern: "## After Any Feature Change[\\s\\S]*?0\\. \\*\\*Regression status\\*\\*:[\\s\\S]*?1\\. \\*\\*Skill docs\\*\\*:"
weight: 3
---

The regression-status item must precede the existing Skill docs item. This
deterministic check replaces an LLM grader that rejected the correctly ordered
`0. Regression status` / `1. Skill docs` checklist in a real smoke run.
