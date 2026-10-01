# Architecture

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Logging | pino v8.x |
| Tests | `node --test` |

## Functional Domains

| Domain | Purpose | Key Components |
|---|---|---|
| notifications | Schedule and deliver reminders | `src/notifications/` |
