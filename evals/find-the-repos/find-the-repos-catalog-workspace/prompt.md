---
tags: [find-the-repos, metadata, routing]
allowed_tools: [Read, Glob, Grep, Write, Edit, AskUserQuestion]
max_turns: 90
timeout_seconds: 1200
runs: 1
---

/make-it-work:find-the-repos --autopilot

# Off-cycle date controls

Expose allowPayoutDateChange in the off-cycle update payload and add the
checkbox labelled "Allow payout date changes" to control the payoutDate edit
lock. Check the existing work before assuming all of it is new.

The Payments story must apply the chosen date in its payout execution flow.
The payroll-summary service must expose generate-report using the selected
date. Those are central parts of this request, alongside the local edit UI/API.

MARV-45441 is an independent ticket mentioned for context only. This pasted
requirement has no assigned primary ticket key yet.
