---
type: regex
target: trace
pattern: 'File created successfully at: [^\n]*make-it-work/epic-[a-z0-9-]+-\d{8}-\d{4}\.md'
weight: 3
---

The Write tool must report a successful creation of the epic, not merely an attempted write that the sandbox denied.
