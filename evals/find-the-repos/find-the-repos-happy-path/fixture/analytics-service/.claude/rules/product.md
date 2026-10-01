# Product

Analytics Service aggregates cross-service usage events into dashboards for the product team.

## Use cases

| ID | Use Case | Actor | Trigger | Domains |
|---|---|---|---|---|
| UC-01 | View Usage Dashboard | Product Manager | PM opens the analytics dashboard | analytics |

## Upstream data sources

- Ingests `reminder.snoozed` events emitted by `notifications-service` for usage reporting. This
  service does not generate, deliver, or snooze reminders itself — it only counts them after the
  fact.
