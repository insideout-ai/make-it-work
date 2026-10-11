# Spec: DEMO-200 — Snooze a task's reminder

> **Status:** Answered

## Business goal

Users whose tasks become overdue should be able to push the reminder back ("snooze") instead of
being nagged immediately, without losing the task or its original due date.

## Requirements

- A user can snooze an open, overdue task for a fixed duration (1 day).
- While snoozed, `sendReminder` must not notify the owner, even if the task is still overdue by
  `dueAt`.
- Snoozing a task that is not overdue, or not open, is a no-op (return `false`, no state change).
- Completing a task clears any snooze.

## Acceptance Criteria

1. Given an open, overdue task, when the owner snoozes it, then `sendReminder` returns `false` and
   sends no notification until the snooze period elapses.
2. Given a task that is not overdue, when the owner tries to snooze it, then nothing changes and
   the function returns `false`.
3. Given a snoozed task, when the owner completes it, then the snooze state is cleared.

## Out of scope

- Configurable snooze durations (fixed at 1 day for this ticket).
- Any UI for triggering snooze — this ticket is the service-layer behavior only.

## Open implementation note

This codebase already has two different patterns for cross-cutting task behavior:
`src/tasks/completeTask.js` broadcasts a `task.completed` event via
`src/events/taskEvents.js`, which `src/notifications/sendReminder.js` could subscribe to; but
`sendReminder.js` itself currently reads task fields directly and makes its own overdue decision
inline, with no event involved. The spec does not say which pattern snooze should extend.
