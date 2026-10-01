# Architecture

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Tests | `node --test` |
| Persistence | in-memory array (`taskRepo.js`), no real DB yet |

## Directory structure

```
src/
  tasks/
```

## Functional Domains

| Domain | Purpose | Key Components | Key Functions |
|---|---|---|---|
| tasks | Create and complete tasks | `src/tasks/` | `createTask`, `completeTask`, `getTaskById` |

For detailed domain information, see `/domain-tasks`.

## Architectural constraints

- **Single-task lookups must go through `taskRepo.getTaskById`.** It is the only place that filters out soft-deleted tasks (`deletedAt !== null`) and applies a deterministic sort before taking one row. Reading from `taskRepo.tasks` directly, anywhere outside `taskRepo.js`, bypasses that filter and can resurrect a soft-deleted task.

## Known technical debt

- No real database yet; `taskRepo.tasks` is a plain in-memory array standing in for a table.
