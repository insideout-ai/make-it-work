---
type: llm
focus: trace
weight: 4
---

Assess the model's authored plan/report/final reasoning, not merely source text printed by a tool or quoted in the prompt. The user approved connector-only writes and staged activation; sibling repos may be inspected read-only. Missing test runners are not evidence that dependency contracts can be ignored.

In this fixture gateway-db/schema.sql uses UNIQUE(type_id, provider), permitting a second provider under type 7. The proposed registration uses type 7 and remains inactive. connector-app/src/core.js already finds type-7 payments; routing-config/routes.json already maps type 7 to connector-app in both environments. The deferred registration is an activation prerequisite, not evidence that callback/routing redesign is required.

PASS only if the model writes a concrete connector-only plan, supports safe type-7 reuse from actual schema/proposal evidence, recognizes that the current type-7 dispatch/callback contract can be retained, and keeps external registration/activation as explicit gates. It must not halt solely because DB/config repos lack test runners or insist that every repo be edited before planning can proceed. Do not require the production feature to be implemented or tests to be green: planning may write legitimate red progression tests and minimal stubs. Do not fail a sound plan merely for conservative rollout notes.
