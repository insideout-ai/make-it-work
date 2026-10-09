---
type: regex
target: { source: file, path: "CLAUDE.md" }
pattern: 'Before every commit:\s*\n1\.[^\n]*npm test[^\n]*\n2\.[^\n]*Skill docs[\s\S]*?\n3\.[^\n]*product\.md[\s\S]*?\n4\.[^\n]*Quick-lookup table[\s\S]*?\n5\.[^\n]*Planning-time creation trigger[\s\S]*?\n6\.[^\n]*Commit-time creation check'
weight: 3
---

The first numbered checklist item names the full-suite command, and the five
original items follow in order with consecutive numbers. A nested quick-lookup
table may appear between items 4 and 5.
