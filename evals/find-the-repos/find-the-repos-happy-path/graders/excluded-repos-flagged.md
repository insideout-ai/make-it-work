---
type: llm
focus: { source: file, path: "make-it-work/SNOOZE-100/SNOOZE-100-repos.md" }
weight: 2
---

The workspace has two repos that should be explicitly flagged, never silently dropped:
- `billing-service`, which has no `.claude/rules/product.md` but does have a README.
- `archive-service`, which is named in the workspace's orientation file but has no directory on
  disk in this workspace.

Judge whether BOTH are explicitly named with a reason. Billing-service must
remain assessed through README/CLAUDE fallback and a code search; missing
product.md alone is a flag, not grounds to exclude it. A No match assessment
after those checks is valid. Archive-service must be flagged not found on disk.

PASS only if both are called out and billing-service was not excluded solely
for missing product.md. FAIL if either is missing or the fallback was skipped.
