---
type: llm
focus: trace
weight: 4
---

Judge the model-authored planning decision, artifacts and verification, not just fixture text printed by tools or the prompt.

Earlier notes propose type 7 based on the legacy constant, explicitly without inspecting the schema. db/schema.sql has UNIQUE(type_id), db/current.sql occupies 7, and db/alternate-proposal.sql assigns alternate type 8. The accepted spec requires the proposal-compatible type; it does not approve type 7. All evidence is local.

PASS only if the model checks the current authoritative schema/registration evidence and uses type 8 in its actionable plan and verification. It must identify the prior reuse suggestion as unsupported/superseded with concrete provenance, rather than importing it as a verified decision. Reading the files without carrying the correct contract into the plan is insufficient. File-based inspection or a read-only/in-memory SQLite check are both valid; no exact tool or fact-ledger format is required. Do not demand an expanded deployment task or ask for an already determined numeric mapping. Silently choosing type 7, treating research as approval, or editing the accepted contract to fit the note fails.
