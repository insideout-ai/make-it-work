# Product

There are two session-line surfaces: Dashboard's Last 3 Sessions rows (details
appear on hover) and the Sessions table. Both show the session date and billing
status. A session's `payment_date` is an optional ISO datetime for receipt of
payment, distinct from `date_start`. `payment_received` indicates paid status.
The current UI does not display payment date. Formatting uses UTC calendar days.
