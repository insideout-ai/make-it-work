# Product

ledger-api records every money movement as a balanced double-entry ledger entry.

## Core domain concepts

- **Entry**: a pair of debit and credit legs of equal amount.

## Use cases

| ID | Use Case | Actor | Trigger | Domains |
|---|---|---|---|---|
| UC-08 | Post Entry | Payments service | A withdrawal or refund completes | ledger |

For detailed use case flows, see `/uc-08-post-entry`.
