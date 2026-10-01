---
name: domain-tasks
description: "Task creation and completion logic and validation rules. Use when touching src/tasks/ or task status transitions."
---

## Summary

Owns creating and completing tasks: in-memory objects with a title, owner, assignee, status, and soft-delete marker.

## Domain Validation Rules and Business Logic

- `createTask` requires a non-empty `title`; throws otherwise.
- `completeTask` throws if the task's status is already `done`.
- `completeTask` must not succeed for a soft-deleted task (`deletedAt` set) — it must look the task up through `getTaskById`, never through the raw `tasks` array, so the soft-delete filter always applies.

## Backend Functions

| Function | Import path | Called from | Key params/returns |
|---|---|---|---|
| `createTask` | `src/tasks/createTask.js` | UC-01 | `{ title, ownerId }` → task object with `status: 'open'` |
| `getTaskById` | `src/tasks/taskRepo.js` | UC-02 | `id` → task object or `null`; filters out soft-deleted rows |
| `completeTask` | `src/tasks/completeTask.js` | UC-02 | `id` → task object with `status: 'done'` |

## Cross-references

- Related Use Case Skills: `/uc-01-create-task`, `/uc-02-complete-task`
