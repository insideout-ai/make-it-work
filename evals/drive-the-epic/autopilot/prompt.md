---
tags: [drive-the-epic]
allowed_tools: [Read, Write, Bash, AskUserQuestion]
max_turns: 60
timeout_seconds: 600
runs: 1
---

/make-it-work:drive-the-epic --autopilot

Product mode; full applicable review. Logged-in customers need to export their own order history as CSV for reconciliation. Start with all available orders downloaded directly, then add inclusive date-range filtering and friendly amount formatting. Columns: order_id,date,item,amount,status. Never expose another customer's orders. An empty export contains headers. No rollout or KPI commitments were supplied; preserve actual unknowns. Do not publish Jira or start implement.
