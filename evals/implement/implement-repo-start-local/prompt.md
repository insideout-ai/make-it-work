---
tags: [implement, repo-start, scope]
allowed_tools: [Read, Glob, Grep, Bash, Write, Edit, Agent, Skill, AskUserQuestion]
max_turns: 90
timeout_seconds: 900
runs: 1
---

/make-it-work:implement START-402

Use the pasted ticket below and local project evidence only; do not fetch a tracker ticket. Use Autonomous mode, answer refinement questions here, and keep the existing startup-eval branch. Those startup choices are explicit; don't ask them again. I have supplied no workspace flag or repository selection beyond the repository where this session starts.

Ticket: Rename the internal reference parameter of createLegacy to paymentReference for clarity, preserving its exported function behavior and returned fields. No registration, routing or provider behavior change is requested.

Start a fresh run through its initial Context check, then stop before refinement, planning or implementation. Leave source and tests unchanged. Do not modify sibling repositories, change their branches, commit, push or publish. Use the directly loaded plugin's Base directory, not a separately installed cached plugin.
