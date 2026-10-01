---
name: uc-03-receive-overdue-reminder
description: "Receiving a reminder when a task becomes overdue. Use when changing reminder or escalation logic."
---

## Summary

A user sees a reminder once one of their tasks passes its due date without being completed.

## Actor & Preconditions

Actor: the task's owner. The task must have a due date.

## Trigger

The task's due date passes while it is still open.

## Main Flow

1. The system detects the task is overdue.
2. A reminder is generated naming the task.
3. The user sees the reminder.

## Alternative / Error Flows

- If the task has no due date, no reminder is ever generated.

## Cross-references

- Related Domain Skills: `/domain-notifications`
- Related Use Case Skills: `/uc-01-create-task`
