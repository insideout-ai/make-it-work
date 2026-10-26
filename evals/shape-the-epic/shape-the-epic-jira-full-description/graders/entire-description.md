---
type: llm
focus: { source: file, path: "make-it-work/DEMO-42-jira-description.md" }
weight: 3
---

Judge the prepared ticket description. PASS only if it preserves the entire supplied saved-address epic, including the title, Product mode, Draft — pending review status, focused review scope, permissions table with account isolation, complete Gherkin scenario, inline and consolidated household-limit open item, invited-pilot rollout, sharing exclusion, readiness checklist and Not assessed list, and the complete Decision log table.

The Decision log must retain all four rows with their substantive decisions, rationales, and statuses: invited pilot / Collect feedback before wider rollout / Confirmed; five-address proposal with its [autopilot best-guess] prefix / Proposed starting point for the pilot / Proposed; deferred household-limit decision / Requires product clarification / Open or Deferred; sharing exclusion / Keep this epic focused on individual checkout / Out of scope. A heading without the rows or a summary of the table fails. Harmless formatting differences are acceptable; omissions, changes in meaning, or promotion of proposed/deferred decisions fail. The separate JSONL audit data, including AUDIT_ONLY_RUN_DETAILS, must not be included.
