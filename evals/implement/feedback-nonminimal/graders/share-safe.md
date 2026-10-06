---
type: regex
target: { source: file, path: "make-it-work/implement-feedback.md" }
pattern: "DEMO|policy\\.js|canProceed|denied-role|make-it-work/DEMO|Members may proceed|member role|role.{0,20}member|'member'|`member`"
match: not_contains
weight: 3
---
