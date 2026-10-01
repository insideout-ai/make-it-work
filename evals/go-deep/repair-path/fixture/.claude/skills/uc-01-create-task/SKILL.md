---
name: uc-01-create-task
description: "Creating a new task. Use when changing task-creation fields or validation."
---

## Summary

A user submits a task title to add a new open task to their list.

## Actor & Preconditions

Actor: any authenticated user. No preconditions.

## Trigger

User submits a task title.

## Main Flow

1. User enters a title and submits.
2. The task is created with status "open" and the user as owner.
3. The new task appears in the user's task list.

## Alternative / Error Flows

- If the title is empty, the submission is rejected and the user sees a validation error.

## Cross-references

- Related Domain Skills: `/domain-tasks`
- Related Use Case Skills: `/uc-02-complete-task`
