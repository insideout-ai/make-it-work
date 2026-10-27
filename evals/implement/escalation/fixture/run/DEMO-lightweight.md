# Lightweight implementation — DEMO

## Summary

Round 1 allowed administrators next to members. Fix round 1 addressed review
finding #1 (the `admin` role was still denied because of a case mismatch) by
denying only guests.

## Changed paths

- policy-app: `src/policy.js`

## Checks

- `node --test` — 2 passed (member allowed, guest denied).

## Discoveries

None

## Risk signal

None

## Fix round 1

Fixed review finding #1 in `src/policy.js:canProceed` directly.
