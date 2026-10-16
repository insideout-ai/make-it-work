---
type: llm
focus: { source: file, path: "make-it-work/define-test-strategy-autopilot-log.jsonl" }
weight: 3
---

This file should be a JSONL log (one JSON object per line) of autopilot
decisions made while running `define-test-strategy --autopilot` in **fresh**
mode against a single-repo fixture where go-deep has run and no test-strategy
output or tests exist. Phase 1 therefore finds nothing and shows no
prior-output menu, Phase 2 detects one location (the repo itself, `.`), and
there are no tests to tag.

Judge whether the log satisfies ALL of the following:

1. Every line is valid JSON with at least `phase`, `site`, `kind`, `chosen` and `rationale` fields.
2. There is a Phase 2 line with `site` `"location-confirm"` whose `chosen` selects the repo's own location (`.` or an equivalent label) and does not choose "Add another location".
3. If a line with `site` `"go-deep-offer"` exists, its `chosen` is "Continue without it". (go-deep has run here, so this site should not normally be reached; its absence is fine.)
4. There is no line for a Phase 1 prior-output menu (for example a `site` naming the prior-output, refresh or migrate menu), since fresh mode never shows it.
5. No line records a git hook choice or a placeholder test being scaffolded.

A `tag-and-migration-confirm` line is neither required nor forbidden.

PASS only if all of 1-5 hold. List any that fail, quoting the relevant line(s).
