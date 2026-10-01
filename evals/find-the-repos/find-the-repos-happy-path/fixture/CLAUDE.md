# Acme Platform Workspace

Multi-repo workspace for the Acme platform. Each row below is a separate git checkout living as a
sibling directory here, documented by its own `.claude/rules/product.md`.

| Repo | Purpose | Notes |
|---|---|---|
| `notifications-service` | Schedules and delivers reminders and alerts to users | |
| `tasks-api` | Owns task creation, assignment, and lifecycle status | |
| `billing-service` | Invoicing and payment processing | |
| `analytics-service` | Cross-service usage analytics and reporting | Consumes events emitted by `notifications-service` |
| `legacy-worker` | Nightly batch cleanup jobs | Consumes events emitted by `notifications-service` |
| `archive-service` | Cold storage for closed tickets | Not yet checked out in this workspace |
