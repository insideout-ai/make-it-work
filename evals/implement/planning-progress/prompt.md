---
tags: [implement, plan, activity]
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent, Skill, AskUserQuestion]
max_turns: 180
timeout_seconds: 1800
runs: 1
---

/make-it-work:implement make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-spec.md --mode tdd --continue-here

I select Guided mode and approve creating/switching to the ticket-named branch from main. Reuse the accepted local spec as-is; that reuse and its spec approval are explicitly authorized. Complete normal startup, testing readiness and initial planning. The configured Node test runner is sufficient for this small policy change; do not install tooling or create a test-strategy skill or test map. Keep all workflow artifacts under the invocation repository.

After the initial plan has passed validation and its handoff is accepted, stop at the normal Plan approval gate and leave that approval unanswered. Do not implement the feature, publish to a tracker, commit, push or open a PR. Leave concrete coverage declarations, supported commands and expected results in the plan. Do not write tests, stubs or preparation evidence before Plan approval. The existing test files must remain unchanged; actual test preparation happens in Write Tests after approval. Do not ask for choices already supplied here; the Plan approval gate remains required.
