# OFFCYCLE-321 — Off-cycle payout date edit lock

Find the repositories involved in letting an operator toggle whether an
off-cycle payout date can be edited. The API payload should expose
allowPayoutDateChange alongside payoutDate on PATCH /off-cycles/:id, and the
checkbox UI should mirror the edit lock. The ticket may overlap earlier work;
we do not know which pieces are already delivered or correct.

payroll-summary and Payments consume the resulting dates. Their behavior needs
to be checked when the requirement is refined. They are named systems here,
not assumed local repositories. No code changes are requested at this stage.
