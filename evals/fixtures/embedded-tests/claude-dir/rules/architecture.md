# Architecture

## Functional Domains

| Domain | Owns | Used by |
| --- | --- | --- |
| accounts | `src/account.py`, `src/experimental.py` | UC-01 and UC-02 use distinct functions in account.py; experimental has no callers |
| labels | `src/labels.py` | UC-03 |

Tests of checkout discount behavior live inside `src/account.py`, alongside its
executable documentation example. Label tests are separate, colocated under
`src/`. New checkout tests belong in `DiscountTests` inside account.py.
