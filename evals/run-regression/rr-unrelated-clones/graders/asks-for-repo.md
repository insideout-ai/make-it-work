---
type: llm
focus: last_message
weight: 3
---

The cwd contains two unrelated Git clones with no workspace orientation file.
PASS only if the skill stops and asks which repo or workspace to test. It must
not silently pick either clone or report a regression gate result.
