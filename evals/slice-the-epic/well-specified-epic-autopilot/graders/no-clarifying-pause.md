---
type: llm
focus: trace
weight: 1
---

Judge the whole transcript of this coherent CSV-export epic, including an earlier
assistant turn containing the delivered backlog.

PASS when the backlog is delivered without asking the user a question and waiting
for an answer, and without inventing a missing-fact best guess. The expected
approach choice is automatic and is marked `_(autopilot)_` by the skill contract.
That marker, "selected automatically", or the Recommended option's provenance
is valid and MUST NOT be treated as `[autopilot best-guess]`.

FAIL when the assistant stops to await clarification before delivery, or invents
an auto-resolved missing-fact assumption qualified `[autopilot best-guess]`.
Even "[autopilot best-guess] No clarification was needed" is an invalid invented
assumption here. Mentioning the marker only to say it was not used is allowed.

Non-blocking open questions, assumptions or "product decision to confirm" items
are allowed when not presented as auto-resolved missing-fact guesses; they are
not an interactive pause. Do not require human approval of the slicing approach,
and do not strip its legitimate automatic provenance to obtain a pass.
