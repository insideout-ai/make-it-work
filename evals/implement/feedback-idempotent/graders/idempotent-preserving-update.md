---
type: llm
focus: { source: file, path: "make-it-work/implement-feedback.md" }
weight: 3
---

PASS only if all of the following hold:

1. There is exactly one opening and one closing marker for `2026-01-03T10:00:00Z`.
2. That block no longer contains the stale placeholder and now records a Complete minimal run with zero fix rounds and zero replans.
3. The complete older block for `2025-12-01T09:00:00Z` is unchanged and still present.
4. The user-authored sentence `User note: keep this sentence.` is unchanged and still present.
5. The cumulative header still records `Schema: 1` and `Reporter: Anonymous`.
