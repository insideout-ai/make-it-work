---
name: uc-01-create-task
description: "Creating a new task. Use when changing task-creation fields or validation."
---

## Summary

A user creates a new task by submitting a title.

## Actor & Preconditions

Actor: any user. No preconditions.

## Trigger

User submits a task title (and optionally an owner).

## Main Flow

1. User submits a non-empty title.
2. A task is created with `status: 'open'`, `assignedTo` set to the owner, and `deletedAt: null`.

## Alternative / Error Flows

- If the title is empty, task creation is rejected with an error.

## Cross-references

- Related Domain Skills: `/domain-tasks`
- Related Use Case Skills: `/uc-02-complete-task`
