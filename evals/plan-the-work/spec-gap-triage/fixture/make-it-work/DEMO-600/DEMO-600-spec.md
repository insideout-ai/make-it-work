# Spec: DEMO-600 — Task priority

> **Status:** Answered

## Business goal

Task owners want to mark which tasks matter most, so they can tell urgent work apart from routine
work when they look at their list.

## Requirements

- `createTask` accepts an optional `priority` of `low`, `normal`, or `high`.
- When `priority` is omitted, the task is created with `priority: "normal"`.
- Any other `priority` value is rejected (see Decision Log).

## Acceptance Criteria

1. Given a title and `priority: "high"`, when the owner creates a task, then the task has
   `priority: "high"`.
2. Given a title and no priority, when the owner creates a task, then the task has
   `priority: "normal"`.
3. Given a title and `priority: "urgent"`, when the owner creates a task, then `createTask` throws
   an error with the message `invalid priority` and no task is returned.

## Out of scope

- Changing or editing a task's priority after creation.
- Any UI for priority.

## Decision Log

| Question | Gap Type | Answer |
| --- | --- | --- |
| What should happen when `createTask` receives a priority outside low/normal/high? | Missing edge case | Reject it: throw `invalid priority`. Do not silently fall back to `normal`. |
| Are priority values case-sensitive? | Missing definition | Yes — only the exact lowercase values are valid; `"HIGH"` is rejected like any other invalid value. |

## TBD

- Whether overdue reminders should be ordered or filtered by priority — deferred to DEMO-601 by
  the product manager. Reminder behavior stays unchanged in this ticket.
