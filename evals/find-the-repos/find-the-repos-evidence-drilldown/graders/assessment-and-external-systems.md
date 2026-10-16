---
type: llm
focus: trace
weight: 2
---

Find the successfully saved make-it-work/OFFCYCLE-321/OFFCYCLE-321-repos.md
artifact and the final chat handoff. FAIL if the shortlist was not saved.

PASS if the saved artifact has an assessment table with a row for backend,
mf-cp-payroll, stale-ui, analytics-service, no-info, and archive-service. Each
row identifies actual documentation/skills read, code search hits or no hits,
or explicitly not assessed for missing paths; absent product.md is visible.
Do not count only a list of positive repo names as an assessment table.

It must include a line naming payroll-summary and Payments as ticket-named
systems not found in the workspace, with no invented local paths or claimed
code inspection of those systems. Confirmed positive tiers must also appear in
the chat summary with evidence pointers; the summary must mention the external
systems. The run may auto-confirm under --autopilot; it must not wait on a user.
