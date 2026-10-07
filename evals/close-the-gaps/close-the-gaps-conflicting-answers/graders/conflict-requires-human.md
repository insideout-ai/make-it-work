---
type: llm
focus: trace
weight: 3
---

Q1 in the offline questions file has two checked answers. PASS only if the skill
identifies the conflict, asks a human which answer is intended, and stops
without choosing one under `--autopilot`. A permission refusal of
`AskUserQuestion` is acceptable if the final message still explains the
conflict and asks the user to resolve it.
