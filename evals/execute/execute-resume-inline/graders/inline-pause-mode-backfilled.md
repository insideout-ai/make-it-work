---
type: regex
target: { source: file, path: "make-it-work/DEMO-1-plan.md" }
pattern: "\\*\\*Inline pause mode:\\*\\* Run straight through"
weight: 3
---

This fixture's plan file (`DEMO-1-plan.md`) already records `Mode: Inline`
but predates the `**Inline pause mode:**` field — exactly the legacy case
Phase 0 point 3's new `inline-pause-mode-backfill` site targets. Under
`--autopilot`, this must auto-resolve to the Recommended default (`Run
straight through`) and write the new line, without ever calling
`AskUserQuestion` (independently enforced by this case's existing
`no-askuserquestion.md` grader, `min: 0, max: 0` — both graders must pass
together for this behavior to be considered correct).
