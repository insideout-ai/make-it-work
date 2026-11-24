---
type: llm
focus: trace
weight: 1
---

Judge the actual coordinator handoff. It must preserve the accepted event-boundary requirements while treating the prior report's "already implemented/no production changes" claim as unverified. Require verification of real upload validation on both entry points and preview completion/failure ordering, with the relevant behavior not mocked away. It may identify the bugs itself or pass precise unresolved checks to the planner. Do not require a particular report format or another user approval. Fail if it prescribes docs-only work, treats passing proxy tests as proof, reopens already accepted product behavior, changes production/tests/spec, or claims fixes performed.
