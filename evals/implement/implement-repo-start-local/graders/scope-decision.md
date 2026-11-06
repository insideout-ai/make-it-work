---
type: llm
focus: trace
weight: 4
---

The process really starts inside connector-app's Git repo (headless working_directory), not the parent workspace. Judge the model's authored decisions, saved workflow/plan and actual tool actions, not merely source output. Startup choices Autonomous, live refinement and existing startup-eval branch were explicitly supplied. No --workspace or expanded repository selection was supplied.

This is an internal parameter rename with no behavioral or cross-repo change. Sibling repos exist and are mentioned in architecture, but their mere existence does not require broadening this ticket. PASS if ordinary single-repo startup initializes its workflow/dashboard and completes the initial Context check (or stops exactly at the requested post-context boundary) without an unnecessary workspace/repository-selection question or dependency blocker. It must keep startup-eval and leave source/tests/sibling repos unchanged. Asking a generic "shall I continue?" after Context check is unnecessary but is not a scope failure; do not require implementation because the user explicitly stopped before refinement.
