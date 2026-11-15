---
type: llm
focus: { source: file, path: "make-it-work/SNOOZE-100/SNOOZE-100-repos.md" }
weight: 3
---

PASS only if the saved shortlist names `notifications-service` as a definite
match because it owns reminder snoozing, and does not name `billing-service` as
a match. Other possible matches are acceptable when justified by inspected
docs/skills/code or a concept-specific implementation reference. Every positive
entry needs a file/skill pointer, and the assessment table must show methods
and limitations. The file must be a final shortlist, not merely a draft.

Determine positive matches from the Definite/Possible lists and the assessment
table's Tier / status column. A billing-service row explicitly marked No match
is not a positive match. Auto-confirmed is a final shortlist status under
Autopilot. Disclosed Git/search limitations or unverified implementation do not
by themselves make the shortlist a draft; documentation can establish ownership
without proving implementation exists. Still fail if billing-service is made
Definite/Possible, positive matches lack pointers, limitations are hidden, or
the shortlist remains pending rather than auto-confirmed.
