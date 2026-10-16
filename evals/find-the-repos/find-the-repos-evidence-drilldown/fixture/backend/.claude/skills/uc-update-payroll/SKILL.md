---
name: uc-update-payroll
description: Payroll update behavior.
---

# Update payroll

## Off-cycle changes

An operator changes payoutDate only when allowPayoutDateChange is true.
The update payload is handled by src/offCycles.ts. These documents describe
the intended behavior; check current source when routing a ticket.
