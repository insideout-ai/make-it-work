---
type: llm
focus: trace
weight: 3
---

PASS if the run's first implementation search precedes the product/skill
drill-down, and both the saved shortlist and chat summary lead with existing
or partial implementation / verify-and-finish, with pointers: backend/src/offCycles.ts
already declares allowPayoutDateChange and payoutDate plus the update route;
mf-cp-payroll/src/OffCycleEditor.ts already maps the permission bit to checkbox
and date-disabled state. It must recommend verifying/finishing those pieces
rather than assuming all code is new. It must qualify that these hits do not
prove endpoint wiring, persistence, permissions, or end-to-end correctness.
FAIL if implementation observations appear only in private reasoning, only
docs are cited as code, existing source is missed, or the ticket is declared
complete from grep. No tests or code changes should be performed by this skill.
