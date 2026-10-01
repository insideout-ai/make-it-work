---
tags: [slice-the-epic, smoke]
allowed_tools: [Write]
max_turns: 15
timeout_seconds: 300
runs: 1
---

/make-it-work:slice-the-epic --autopilot

Epic: Let a logged-in customer export their own order history as a CSV file, so they can reconcile purchases in their own accounting software.

Current state: order history is viewable in the app, 90 days back, with no export option.

Needed: a logged-in customer can choose a start and end date and download a CSV of their own orders for that range.

Existing acceptance criteria:
- The customer can select a start date and an end date before exporting.
- The CSV includes columns: order_id, date, item, amount, status.
- Ranges under 1,000 rows download directly in the browser.
- Ranges of 1,000 rows or more are emailed as an attachment within 5 minutes instead of downloading directly.
- The export only ever includes the requesting customer's own orders, never another customer's.
