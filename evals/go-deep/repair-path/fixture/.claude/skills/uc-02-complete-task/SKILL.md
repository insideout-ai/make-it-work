---
name: uc-02-complete-task
description: "Marking an open task as done. Use when changing completion rules."
---

## Summary

A user marks one of their open tasks as done.

## Actor & Preconditions

Actor: the task's owner. The task must currently be open.

## Trigger

User marks an open task complete.

## Main Flow

1. User selects an open task and marks it done.
2. The task's status changes to "done" and a completion timestamp is recorded.

## Alternative / Error Flows

- If the task is already done, the action is rejected with an error.

## Cross-references

- Related Domain Skills: `/domain-tasks`
- Related Use Case Skills: `/uc-01-create-task`
