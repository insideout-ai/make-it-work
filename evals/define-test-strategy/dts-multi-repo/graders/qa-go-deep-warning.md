---
type: llm
focus: last_message
weight: 2
---

`qa-automation` has no go-deep output (no `.claude/skills/uc-*` or `domain-*`,
no go-deep `CLAUDE.md`, no `.claude/rules/`). The skill should warn, in words
equivalent to "go-deep has not been run in `qa-automation`; run it there for
better domain context", and continue.

Answer PASS only if this message says go-deep has not been run in
`qa-automation` and the run still completed (it reports the skill written or
map relationships assessed). Answer FAIL otherwise.
