---
tags: [shape-the-epic, technical-debt]
allowed_tools: [Write, Edit, Read, AskUserQuestion]
max_turns: 30
timeout_seconds: 600
runs: 1
---

/make-it-work:shape-the-epic --autopilot

Technical-debt epic: Faster CI feedback.

Our engineers say that waiting for pull-request checks interrupts their work. We want engineers to receive a usable check result sooner while keeping the current required checks effective. We do not yet have measured durations, a target threshold, or an agreed representative workload. I have no more evidence to provide right now.

Lea raised this in a team discussion. We use GitHub and Slack today; nothing about tooling or implementation has been decided. We have not agreed any external prerequisites or fixed technical constraints. The current working directory is the project root.
