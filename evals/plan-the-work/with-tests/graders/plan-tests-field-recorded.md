---
type: regex
target: { source: file, path: "make-it-work/DEMO-400-plan.md" }
pattern: '\*\*Tests:\*\*[^\n]*src/tasks/createTask\.test\.js[^\n]*(?:npm test|node --test)[^\n]*red[^\n]*(?:whitespace|trim)'
weight: 3
---

The step's `**Tests:**` field names the actual test file and command, records
that the new assertions were confirmed red, and identifies whitespace/trim
behavior as the reason. This accepts equivalent prose instead of requiring
one precise phrase. The separate `progression-test-added` grader confirms the
test file exists; on-disk decision-log persistence remains a manual check
because this fixture makes no autopilot choice and an empty log is valid.
