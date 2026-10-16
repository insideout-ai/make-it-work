# Product

payments-api lets customers withdraw money and receive refunds, subject to velocity limits.

## Core domain concepts

- **Withdrawal**: a debit of an amount from a customer's balance.
- **Velocity limit**: the maximum amount a single withdrawal may move.

## Use cases

| ID | Use Case | Actor | Trigger | Domains |
|---|---|---|---|---|
| UC-08 | Withdraw Money | Customer | Customer calls POST /payments/withdraw | velocity |

For detailed use case flows, see `/uc-08-withdraw-money`.
