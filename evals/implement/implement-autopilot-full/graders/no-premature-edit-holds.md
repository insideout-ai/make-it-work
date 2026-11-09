---
type: regex
target: { source: files, path: "make-it-work/DEMO-101/*.json*" }
pattern: '"kind"\s*:\s*"premature-implementation"'
match: not_contains
weight: 3
---

The hook journal is optional when all hooks allow continuation. Inspect run JSON/JSONL artifacts so an absent journal does not become a false failure; any recorded premature-edit event still fails.
