# Architecture

## Tech stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Tests | `node --test` |

## Functional Domains

| Domain | Purpose | Key Components | Key Functions |
|---|---|---|---|
| velocity | Enforce per-withdrawal velocity limits | `src/withdraw.js` | `withdraw` |

For detailed domain information, see `/domain-velocity`.
