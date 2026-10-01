---
type: regex
target: trace
pattern: "execute make-it-work/DEMO-300-plan-v2\\.md"
weight: 2
---

Deliberately tighter than a bare `DEMO-300-plan-v2\.md` match (which would trivially pass just from
the Write tool call's own file_path argument). This requires the literal printed `execute` hint —
"Run `/make-it-work:execute make-it-work/<TICKET>-plan.md`" — to actually name the resolved `-v2`
path, not the bare ticket key (which would resolve to the wrong, stale file).

