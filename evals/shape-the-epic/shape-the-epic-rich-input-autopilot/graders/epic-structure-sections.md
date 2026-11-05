---
type: llm
focus: { source: file, path: "make-it-work/epic-*.md" }
weight: 3
---

Judge the saved epic Markdown supplied as evidence, regardless of which permitted tool wrote it. A direct `Write` call or transcript readback is not required. Missing, empty, or ambiguous artifact evidence fails. Heading capitalization and inline Markdown emphasis do not affect the criteria below.

PASS only if ALL of the following hold:
1. It contains, in order, top-level sections for: What & Why, Definition of Done, Problem & Value Proposition, Target Users & Permissions, KPIs & Success Metrics, Use Cases & Requirements, Rollout Plan, and Open Items & Out of Scope.
2. Target Users & Permissions includes a markdown table with Role / Can View / Can Act columns for at least the "job seeker" role.
3. KPIs & Success Metrics includes at least one KPI with a "Measured by:" line.
4. Use Cases & Requirements includes at least one use case written as "As a ... I want ... so that ..." with a fenced ```gherkin``` Given/When/Then block.
5. A Readiness Checklist follows Open Items & Out of Scope, and a Decision Log follows the checklist. The checks reflect applicable content readiness, not human approval or a fixed number of checks. Material unknowns or unconfirmed assumptions affecting acceptance remain unresolved. The document is identified as a draft pending review.

List any of 1-5 that fail.
