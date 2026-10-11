# Spec: DEMO-400 — Reject whitespace-only task titles

> **Status:** Answered

## Business goal

Users occasionally submit a task with a title made only of spaces (e.g. from a copy-paste
mistake), creating tasks that look blank in the UI. Treat that the same as a missing title.

## Requirements

- `createTask` must reject a `title` that is empty or contains only whitespace, throwing the
  existing `Error("title is required")` — the same error already thrown for a missing title.
- A non-whitespace title must be stored trimmed (leading/trailing whitespace removed).
- `ownerId` validation is unaffected and out of scope.

## Acceptance Criteria

1. Given `title: "   "`, when `createTask` is called, then it throws `Error("title is required")`.
2. Given `title: "  Buy milk  "`, when `createTask` is called, then the created task's `title` is
   `"Buy milk"`.
3. The existing missing-title and happy-path behavior in `src/tasks/createTask.test.js` keeps
   passing unchanged.

## Out of scope

- Any other field's validation.
- UI-level validation — service-layer behavior only.
