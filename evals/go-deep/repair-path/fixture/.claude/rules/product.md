# Product

Mini Task Tracker lets a user create tasks, complete them, and get reminded when one becomes overdue.

## Core domain concepts

- **Task**: a unit of work with a title, an owner, and a status (`open` or `done`).
- **Reminder**: a notification generated when a task's due date has passed.

## Use cases

| ID | Use Case | Actor | Trigger | Domains |
|---|---|---|---|---|
| UC-01 | Create Task | User | User submits a task title | tasks |
| UC-02 | Complete Task | User | User marks an open task done | tasks |
| UC-03 | Receive Overdue Reminder | User | Task's due date passes | notifications |

For detailed use case flows, see `/uc-01-create-task`, `/uc-02-complete-task`, `/uc-03-receive-overdue-reminder`.

## Domain validation rules

- A task must have a non-empty title to be created.
- A task that is already `done` cannot be completed again.
