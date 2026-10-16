---
type: regex
target: trace
pattern: 'File created successfully at: [^\n]*make-it-work/epic-[a-z0-9-]+-\d{8}-\d{4}(?:-\d+)?\.md'
weight: 3
---

Require successful file creation, not just an attempted Write call.
