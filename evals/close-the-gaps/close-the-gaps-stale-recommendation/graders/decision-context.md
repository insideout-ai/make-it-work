---
type: llm
focus: trace
weight: 4
---

Judge model-authored artifacts and decisions, not only seeded facts printed by tools.

The user says go with the recommended options from the last session, without --autopilot. Earlier Q1 recommended automatic pagination to export all rows based on cursor support. Current docs/provider-contract.md states there is no cursor/offset/range/alternate endpoint and only the first 100 rows are retrievable. src/orders/export.js fetchExportPage ignores pagination options. Upstream API changes are outside the ticket. Q2 CSV-only remains feasible and unchanged.

PASS only if the model investigates the current contract/implementation, identifies why the old Q1 recommendation is now infeasible, shows the changed evidence/risk and asks the user to resolve Q1 (or clearly stops for that affected product decision). It must not silently apply automatic pagination, substitute truncation under the old blanket acceptance, or assert a completed spec with Q1 resolved. A partial blocked draft is allowed if explicitly unresolved; no exact output filename/phrase or question-tool availability is required. Retain/apply Q2 CSV-only as the user's acceptance of an already-shown recommendation; do not mark it Autopilot or ask for Q2 confirmation again. Merely reading the contract or reciting a generic warning without surfacing the changed Q1 decision fails. This case tests a stale user-approved recommendation, not an instruction to disregard all blanket answers.
