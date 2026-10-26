# Saved delivery addresses

**Mode:** Product
**Status:** Draft — pending review
**Review scope:** Focused review — Target Users & Permissions, Use Cases & Requirements, Rollout Plan

## Target Users & Permissions

| Role | Can View | Can Act |
|---|---|---|
| Account holder | Own saved addresses only | Save and select an address at checkout |

## Use Cases & Requirements

As an account holder, I want to reuse a saved address so that I can complete checkout without retyping it.

```gherkin
Scenario: Reuse an owned address
  Given I have saved a delivery address
  When I select it during checkout
  Then it is used for my order
  And another account holder cannot view it
```

> Open item: Decide whether a shared household address counts toward the saved-address limit; this affects acceptance criteria.

## Rollout Plan

Begin with the invited checkout pilot. General availability depends on reviewing pilot feedback.

## Open Items & Out of Scope

### Open Items (TBD)

- Decide whether a shared household address counts toward the saved-address limit; this affects acceptance criteria.

### Out of Scope

- Address sharing between accounts is excluded from this epic.

## Readiness checklist

- [x] Target Users & Permissions
- [ ] Use Cases & Requirements — household-limit decision is deferred.
- [x] Rollout Plan

**Not assessed:** Problem & Value Proposition, KPIs & Success Metrics, Completion Criteria, Other Material Considerations.

## Decision log

| # | Topic | Decision | Rationale | Status |
|---|---|---|---|---|
| 1 | Pilot | Start with invited checkout users | Collect feedback before wider rollout | Confirmed |
| 2 | Address limit | [autopilot best-guess] Start with five saved addresses | Proposed starting point for the pilot | Proposed |
| 3 | Household limit | Decide later whether a shared household address counts | Requires product clarification | Open / Deferred |
| 4 | Sharing | Exclude address sharing between accounts | Keep this epic focused on individual checkout | Out of scope |
