# Architecture

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Tests | `node --test` |

## Functional Domains

| Domain | Purpose | Key Components | Key Functions |
|---|---|---|---|
| billing | Create and send invoices | `src/billing/` | `createInvoice` |
| velocity | Track team velocity | `src/velocity/` | `trackVelocity` |

For detailed domain information, see `/domain-billing` and `/domain-velocity`.
