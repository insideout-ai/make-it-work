---
tags: [slice-the-epic]
allowed_tools: []
max_turns: 8
timeout_seconds: 180
runs: 1
---

/make-it-work:slice-the-epic

Epic: A logged-in customer can export their own order history as CSV to reconcile purchases.

Order history is already visible in the app. The customer must be able to select dates, export only their own orders, and receive exports below 1,000 rows as a download. Larger exports must be emailed within five minutes. The CSV contains order_id, date, item, amount, and status. We have not chosen how to slice this work.
