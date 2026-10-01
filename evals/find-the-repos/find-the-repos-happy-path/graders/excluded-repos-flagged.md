---
type: llm
focus: last_message
weight: 2
---

The workspace has two repos that should be explicitly flagged, never silently dropped:
- `billing-service`, which has no `.claude/rules/product.md` at all.
- `archive-service`, which is named in the workspace's orientation file but has no directory on
  disk in this workspace.

Judge whether BOTH are explicitly named in the output with a reason (e.g. "no product.md" for
billing-service, "not found on disk" for archive-service) — not simply absent from the message.

PASS only if both are explicitly called out. FAIL if either is missing from the message entirely.
