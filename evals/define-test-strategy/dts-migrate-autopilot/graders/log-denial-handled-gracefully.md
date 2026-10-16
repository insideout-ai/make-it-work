---
type: regex
target: { source: file, path: "make-it-work/define-test-strategy-autopilot-log.jsonl" }
pattern: '"phase"'
weight: 2
---

The decision log is written at its new make-it-work location and contains a
recorded phase. This location is writable in the fixture; a denial is no
longer the expected result.
