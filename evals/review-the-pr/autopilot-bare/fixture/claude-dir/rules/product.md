# Product

Mini Task Tracker lets a user create tasks and complete them.

## Core domain concepts

- **Task**: a unit of work with a title, an owner, an optional assignee, a status (`open` or `done`), and a `deletedAt` timestamp (`null` unless soft-deleted).

## Use cases

| ID | Use Case | Actor | Trigger | Domains |
|---|---|---|---|---|
| UC-01 | Create Task | User | User submits a task title | tasks |
| UC-02 | Complete Task | User | User marks an open task done | tasks |

For detailed use case flows, see `/uc-01-create-task`, `/uc-02-complete-task`.

## Domain validation rules

- A task must have a non-empty title to be created.
- A task that is already `done` cannot be completed again.
- A task that has been soft-deleted (`deletedAt` set) cannot be completed — it must behave as if it doesn't exist.
