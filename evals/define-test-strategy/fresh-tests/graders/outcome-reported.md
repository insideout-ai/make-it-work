---
type: llm
focus: last_message
weight: 3
---

PASS if the summary accurately reports both metadata paths (.claude/skills/test-strategy/SKILL.md and .claude/testing/test-map.json), validation or blocked/partial writes, and whether the CLAUDE.md pointer changed. A blocked run must leave the pointer unchanged and print both complete proposed artifacts. It must not claim any source/test annotation, rule migration or cleanup occurred.
