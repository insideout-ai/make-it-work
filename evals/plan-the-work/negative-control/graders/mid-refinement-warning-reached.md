---
type: regex
target: last_message
pattern: "(?:mid-refinement|still being refined|still in refinement|unanswered (?:offline )?questions)"
weight: 2
---

Check the assistant's warning to the user, not fixture text in the tool trace. Equivalent wording for the pending refinement is acceptable.
