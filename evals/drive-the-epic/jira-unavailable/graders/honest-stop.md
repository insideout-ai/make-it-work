---
type: regex
target: { source: file, path: "make-it-work/drive-*/state.json" }
pattern: '(?=[\s\S]*^  "status": "Stopped")(?=[\s\S]*"epic": null)(?=[\s\S]*No usable source)[\s\S]+'
flags: m
weight: 3
---
Require an actual stopped checkpoint with no invented epic.
