---
type: regex
target: { source: file, path: "make-it-work/DEMO-101/DEMO-101-state.md" }
pattern: '^(?=[\s\S]*^test_writing_version: 1$)(?=[\s\S]*^test_preparation: (?!none$).+\.json$)(?=[\s\S]*^test_preparation_report: (?!none$).+\.md$)(?=[\s\S]*\| write-tests \| execute \|)'
flags: m
weight: 3
---
