---
type: strategy_pointer
weight: 3
---

Deterministic saved-state check: validate the saved strategy/map and matching
Repo IDs, require exactly one canonical pointer, compare CLAUDE.md with the
fixture's committed baseline and require a successful supported-helper receipt
for an actual pointer edit. The helper validates metadata before writing.
Blocked/partial metadata writes must leave the pointer unchanged; missing
orientation/Skills Reference is a supported skip. Semantic mappings, write-denial
policy, complete fallback and reporting remain covered by the other graders.
