---
type: regex
target: { source: file, path: "make-it-work/implement-feedback.md" }
pattern: "DEMO|policy\\.js|canProceed|Members may proceed|member role|role.{0,20}member|'member'|`member`"
match: not_contains
weight: 3
---
