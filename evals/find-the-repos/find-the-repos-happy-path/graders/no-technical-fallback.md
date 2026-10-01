---
type: regex
target: last_message
pattern: "purely technical"
match: not_contains
weight: 1
---

This ticket has clear business-logic content (snoozing a reminder), so the purely-technical /
architecture.md fallback must never fire here. Contrast with `find-the-repos-technical-fallback`,
where it should.
