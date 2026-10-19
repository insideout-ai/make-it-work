---
type: regex
target: { source: file, path: "make-it-work/go-deep-autopilot-log.jsonl" }
pattern: "\"phase\":\\s*\"Phase 3\"[^\\n]*\"kind\":\\s*\"checkpoint\"|\"kind\":\\s*\"checkpoint\"[^\\n]*\"phase\":\\s*\"Phase 3\""
weight: 3
---

The decision log sits outside `.claude/`, so a headless run with Bash allowed
can write it. The Phase 3 Confirm Scope checkpoint is reached before any file
is written, so a written log always has a Phase 3 `checkpoint` line.
