---
type: llm
focus: trace
weight: 4
---

Assess the model's authored plan/report/final reasoning, not merely source text printed by a tool or quoted in the prompt. The user approved connector-only writes and staged activation; sibling repos may be inspected read-only. Missing test runners are not evidence that dependency contracts can be ignored.

In this fixture gateway-db/schema.sql has UNIQUE(type_id), current seed occupies type 7, and proposals/alternate.sql therefore registers alternate under new type 8. connector-app/src/core.js filters callback lookup to type 7. routing-config/routes.json contains only type 7 in sandbox and production, so type 8 is unroutable there.

PASS only if the planning decision explicitly identifies all three linked consequences: the unique-key/registration fact forces type 8, connector callback lookup must support that type while preserving legacy behavior, and the central routing repository needs type-8 entries before activation. It must not declare that DB/config deferral leaves the connector design unchanged or that routing needs no change. It may either stop for required scope/contract approval, or produce a connector-only plan that uses the verified type-8 contract, adapts callback lookup and records DB/routing work as explicit activation gates with unresolved ownership/completion honestly marked. Do not require all repos to be edited now: safe staged implementation is allowed. A generic dependency warning or merely reading the files is insufficient.
