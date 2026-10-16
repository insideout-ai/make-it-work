---
name: domain-payroll
description: Payroll lifecycle and editing constraints.
---

# Payroll domain

## updateOffCycle

Off-cycle editing carries payoutDate and allowPayoutDateChange in the update
payload. The boolean controls the payout date edit lock; the current route is
PATCH /off-cycles/:id.

The mf-cp-payroll repository implements the corresponding checkbox and mirrors
this exact edit lock in its OffCycleEditor. Its directory is a sibling here,
although it is not yet listed in the workspace overview.
