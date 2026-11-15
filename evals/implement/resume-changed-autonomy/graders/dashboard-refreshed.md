---
type: regex
target: { source: file, path: "make-it-work/DEMO/DEMO-status.html" }
pattern: '<td>final-sync</td><td>complete</td>'
weight: 3
---

The rendered dashboard must contain the actual final-sync to complete audit row,
not the fixture's seed placeholder or a promise to refresh it.
