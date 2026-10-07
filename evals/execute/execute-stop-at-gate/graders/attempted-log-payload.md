---
type: llm
focus: trace
weight: 2
---

Find the attempted decision-log entry for `"site":"mode-choice"`. With Bash
permitted, it may appear in a standalone Bash call to `decision-log.mjs write`
or `append`; otherwise it may appear in a `Write` tool call's `content`. A
denied write may appear only in a `result` event's `permission_denials` array.
A permission denial is not itself a failure here: judge the JSON payload the
model attempted to persist.

That attempted content, for its `"site":"mode-choice"` line, should satisfy
ALL of the following. Note: the `"question"` field's own text may legitimately
mention "review the plan first" as a free-text alternative a user could reply
with instead of picking an option (e.g. "Which approach? (or: review the plan
first, then decide)") — that is expected and must NOT by itself count against
check 1; judge check 1 only against the `"options"` ARRAY itself, not the
`"question"` string.

1. `"options"` is an array with exactly 2 entries (not 3) — there is no
   third "review the plan first" entry in the `options` array.
2. The first option's `"label"` is exactly `"Subagent-Driven (Recommended)"`
   (verbatim, including the parenthetical).
3. The second option's `"label"` is `"Inline Execution"` (or clearly
   equivalent wording naming the Inline option) — never a label suggesting
   "review the plan first" was itself an enumerated choice.
4. `"chosen"` names the Subagent-Driven option, not Inline and not "review
   the plan first".

PASS only if all of 1-4 hold. If no writer call, `Write` call, or matching
`permission_denials` entry contains the attempted content, FAIL — the mode
choice must have been constructed and an attempt made to log it.
