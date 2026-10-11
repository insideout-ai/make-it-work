# Spec: DEMO-300 — Cancel an open task

> **Status:** Answered

## Business goal

Users need to cancel a task they no longer want to track, distinct from completing it, so reports
can tell deliberate cancellations apart from finished work.

## Requirements

- A new `cancelTask(task)` function in `src/tasks/completeTask.js` marks an open task's `status`
  as `"cancelled"` and sets `cancelledAt` to the current time.
- Cancelling a task that is not `"open"` throws `Error("only open tasks can be cancelled")`,
  mirroring the existing `completeTask` guard.
- `createTask` is unaffected.

## Acceptance Criteria

1. Given an open task, when `cancelTask` is called, then `status` becomes `"cancelled"` and
   `cancelledAt` is set.
2. Given a task that is already `"done"` or `"cancelled"`, when `cancelTask` is called, then it
   throws `Error("only open tasks can be cancelled")` and the task is unchanged.

## Out of scope

- Any UI or API surface for cancellation — service-layer behavior only.
- Un-cancelling a task.
