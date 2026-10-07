---
type: regex
target: trace
pattern: '\\"site\\":\\"existing-plan-collision\\"[^\n]*\\"kind\\":\\"checkpoint\\"[^\n]*\\"chosen\\":\\"[^"\n]*-v2'
weight: 3
---

The attempted JSONL decision entry records a checkpoint at the collision
site and chooses the `-v2` suffix. The `v2-plan-created` and
`original-plan-untouched` graders independently verify the actual path and
non-destructive result. This works whether the protected log write appears
as a tool call or in `permission_denials`.
