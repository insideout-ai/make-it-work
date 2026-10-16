---
type: llm
focus: { source: file, path: "make-it-work/SNOOZE-100/SNOOZE-100-repos.md" }
weight: 1
---

PASS if the skill matched this snooze-reminder ticket against the repositories'
product/use-case documentation. FAIL only if it instead used the
`architecture.md` fallback for a purely technical ticket. A statement such as
"the ticket isn't purely technical" describes why the fallback was NOT used
and must PASS.
