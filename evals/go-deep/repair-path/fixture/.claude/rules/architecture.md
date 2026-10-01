# Architecture

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Tests | `node --test` |

## Directory structure

```
src/
  tasks/
  notifications/
  models/
```

## Functional Domains

| Domain | Purpose | Key Components | Key Functions |
|---|---|---|---|
| tasks | Create and complete tasks | `src/tasks/` | `createTask`, `completeTask` |
| notifications | Remind about overdue tasks | `src/notifications/` | `sendReminder` |

For detailed domain information, see `/domain-tasks` and `/domain-notifications`.

## Architectural constraints

- No persistence layer yet; all functions operate on plain in-memory objects.

## Known technical debt

- User roles ("owner" vs "admin") are not yet formally modeled — see `src/models/user.js`.
