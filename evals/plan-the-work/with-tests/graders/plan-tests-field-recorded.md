---
type: regex
target: { source: file, path: "make-it-work/DEMO-400/DEMO-400-plan.md" }
pattern: '\*\*Tests:\*\*(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*src/tasks/createTask\.test\.js)(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*(?:npm test|node --test))(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*red)(?=(?:(?!\n(?:#{1,6} |(?:- )?\*\*)).)*(?:whitespace|trim))'
flags: s
weight: 3
---

The step's `**Tests:**` field names the actual test file and command, records
that the new assertions were confirmed red, and identifies whitespace/trim
behavior as the reason, in any order within that field. Inline text and
multiline per-repo entries are both valid; evidence under a later field or
section cannot satisfy this check. The separate
`progression-test-added` grader confirms the
test file exists; on-disk decision-log persistence remains a manual check
because this fixture makes no autopilot choice and an empty log is valid.
