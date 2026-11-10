---
type: llm
focus: { source: file, path: "make-it-work/DEMO-600/DEMO-600-plan.md" }
weight: 3
---

This plan was produced by an autopilot run of `plan-the-work` for a "task priority" ticket. The
accepted spec's Decision Log says invalid priorities (anything other than exact lowercase `low`,
`normal`, `high`) must be rejected by throwing `invalid priority` — never silently defaulted — and
its TBD section defers any change to overdue-reminder behavior to another ticket.

Judge whether ALL of the following hold:

1. The plan's steps reject invalid priority values with an `invalid priority` error, including a
   wrong-case value such as `"HIGH"`, and do not fall back to `normal` for invalid input.
2. The plan does not change reminder behavior (e.g. `sendReminder` ordering or filtering by
   priority); it leaves that out of scope.
3. The plan's `## Decision Log` contains no row whose Gap Type is a product/"what" type
   (`Scope boundary`, `Unstated assumption`, `Missing edge case`, `Missing definition`) or whose
   question is about invalid-priority handling, case sensitivity, or reminders. Rows with
   technical "how" gap types (e.g. `Placement / pattern`, `Approach`) or `Spec gap` about some
   *other* unsettled behavior are acceptable; an empty Decision Log is also acceptable.
4. The plan does not contain "TBD", "TODO", "implement later", or similar placeholder language
   (a reference to the spec's deferred DEMO-601 item is not a placeholder).

PASS only if all of 1-4 hold. List any that fail, quoting the relevant part of the file.
