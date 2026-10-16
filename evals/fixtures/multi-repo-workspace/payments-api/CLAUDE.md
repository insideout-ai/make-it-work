# payments-api

Payments service: withdrawals, refunds and per-withdrawal velocity limits, served under `/payments`.

## Quick Reference

- Install: `npm install`
- Test: `npm test`

## Rules Files

- `.claude/rules/architecture.md` — service overview, tech stack, and the Functional Domains table.
- `.claude/rules/product.md` — use cases and domain concepts.

## Skills Reference

### Domain Skills

| Skill | Topic | Key code areas |
|---|---|---|
| domain-velocity | Per-withdrawal velocity limits | `src/withdraw.js` |

### Use Case Skills

| Skill | Topic | Load when... |
|---|---|---|
| uc-08-withdraw-money | Withdrawing money from an account | Changing withdrawal validation or limits |
