---
type: regex
target: trace
pattern: '\\"chosen\\":\\"[^"]*\(Recommended\)\\"'
weight: 2
---

Confirms at least one decision-log entry's `chosen` value is the option actually labeled
`(Recommended)`, not a differently-worded or unlabeled choice.
