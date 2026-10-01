---
type: llm
focus: last_message
weight: 3
---

The workspace root has no `.git` of its own, but holds two sibling directories (`repo-alpha`,
`repo-beta`) that each have their own `.git` — and nothing ties them together as one documented
system (no `CLAUDE.md` or service map at the root). Per this skill's Phase 1, this is the
"unrelated clones" case: it must ask the user which repo(s) to check, rather than guessing or
silently picking one.

Judge whether the message asks the user which of the discovered repos (naming `repo-alpha` and/or
`repo-beta`) to check, instead of proceeding on its own guess.

PASS if it clearly asks this question and stops. FAIL if it picks a repo on its own, proceeds to a
Definite/Possible shortlist, or refuses outright instead of asking which to check.
