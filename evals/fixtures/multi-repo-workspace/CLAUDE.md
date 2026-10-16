# Payments Workspace

Workspace root holding three sibling repos. Each repo is its own git repository; run repo-specific work from inside that repo.

## Repos

| Repo | Purpose | Tests |
|---|---|---|
| `payments-api` | Payments service: withdrawals, refunds and velocity limits, served under `/payments` | Unit tests in `payments-api/test/`; behavior and e2e tests in `qa-automation` |
| `qa-automation` | Shared QA repo: behavior and end-to-end tests for the product repos | `qa-automation/tests/` |
| `ledger-api` | Ledger service: posts ledger entries for money movements | No tests of its own; behavior tests in `qa-automation/tests/payments` |
