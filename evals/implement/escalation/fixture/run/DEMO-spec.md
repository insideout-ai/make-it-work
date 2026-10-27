# Refined spec — DEMO: allow administrators through the policy

## Requirement

Administrators may proceed through the policy-protected action, alongside
members. Every other role, including unknown or missing roles, stays denied.

## Acceptance criteria

- Given the role `admin`, when `canProceed` is called, then it returns `true`.
- Given the role `member`, when `canProceed` is called, then it returns `true`.
- Given the role `guest`, when `canProceed` is called, then it returns `false`.
- Given an unknown or missing role, when `canProceed` is called, then it returns `false`.

## Scope

`src/policy.js` only. No new roles, configuration or callers.
