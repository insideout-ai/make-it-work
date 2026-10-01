---
type: regex
target: trace
pattern: '\\"site\\":\\"existing-plan-collision\\",\\"kind\\":\\"checkpoint\\",\\"chosen\\":\\"make-it-work/DEMO-300-plan-v2\.md\\"'
weight: 3
---

Confirms the attempted decision-log entry for the collision site itself records exactly the
resolution the Autopilot Mode table specifies: a `checkpoint` whose `chosen` value is writing to
the `-v2` path — never `"overwrite"`, never `"abort"`.
