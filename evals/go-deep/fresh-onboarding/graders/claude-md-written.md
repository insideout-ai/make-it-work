---
type: regex
target: { source: file, path: "CLAUDE.md" }
pattern: "^#{1,4}\\s.*Skills Reference"
flags: m
weight: 3
---

`CLAUDE.md` sits outside `.claude/`, so a headless run can write it. The
fixture has no `CLAUDE.md`, so this passes only if go-deep wrote one with its
Tier 1 `Skills Reference` heading.
