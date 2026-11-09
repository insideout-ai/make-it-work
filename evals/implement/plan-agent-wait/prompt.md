---
tags: [implement, background-wait, plan]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 100
timeout_seconds: 1200
runs: 1
---

/make-it-work:implement make-it-work/DEMO-WAIT/DEMO-WAIT-spec.md --autopilot --mode tdd

This is a focused Plan-stage wait check. Reuse the existing accepted spec as-is; I explicitly authorize that reuse and request a pause in Plan after the delegation below. Start normally, including branch guard, dashboard announcement, Context check and risk/mode recording. Use the invocation repository root for all workflow artifacts, even after reading plugin files elsewhere.

Once in Plan, before full testing-readiness setup or drafting a plan, checkpoint the delegated activity and launch one read-only general-purpose Agent with `run_in_background: true`. Have it inspect src/policy.js and run the existing baseline (`node --test` or `npm test`) from this repository, then return the actual result. Forbid writes and further delegation in that agent.

While the agent is still running, send a brief waiting response with no tool calls so Stop can allow the wait and its completion notification can resume the session. Do not use blocking TaskOutput, polling or sleeps to avoid this wait. Keep the workflow In Progress during the wait; do not ask me to continue or pause merely to yield.

After its actual report arrives, record my requested pause through the workflow controller, leaving phase Plan and status Paused. Report the baseline result and saved pause. Do not perform full readiness, draft a plan, edit source/tests, enter Execute, mark Complete, commit, push or open a PR. Do not ask a question: the scope and pause are already authorized here.
