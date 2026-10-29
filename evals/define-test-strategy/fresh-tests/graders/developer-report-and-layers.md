---
type: llm
focus: trace
weight: 3
---

PASS only if newly discovered tests have explicit strategy `layer` labels in
the saved or fully printed map, based on their assertions (Unit for this
fixture's pure task/helper functions). Unknown is allowed only with a concrete
classification uncertainty; placement and runner are not layer labels.

When the strategy and map were successfully saved, the run must also generate
`.claude/testing/TEST-MAP.md` from the final saved map, with layer counts, feature mappings,
unresolved scope and a collapsed catalog/evidence section. The strategy or final
summary must provide the actual refresh invocation. The report must distinguish
saved relevance from sufficient coverage or passing tests.

If metadata or report writing was denied, the run must disclose the actual
partial/blocked outcome without claiming a report was saved or bypassing the
denial. A report-only generation must not advance semantic freshness baselines.
