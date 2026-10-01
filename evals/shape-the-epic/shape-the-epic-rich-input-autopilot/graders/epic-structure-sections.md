---
type: llm
focus: trace
weight: 3
---

Find the content passed to the `Write` tool call that creates `make-it-work/epic-....md` in this transcript, and judge that content (not the chat narration around it). **There may be more than one `Write` attempt at a path containing `epic-` and `.md`** (e.g. a stray attempt at an absolute or incorrectly-nested path that the sandbox denied, alongside the one that actually succeeded inside the working directory). Identify the one that actually succeeded — its `tool_result` says something like "File created successfully", with no accompanying `permission_denials` entry for that same `tool_use_id` — and judge only that one's content. Ignore any denied attempt entirely, even if its content looks superficially plausible.

PASS only if ALL of the following hold:
1. It contains, in order, top-level sections for: What & Why, Definition of Done, Problem & Value Proposition, Target Users & Permissions, KPIs & Success Metrics, Use Cases & Requirements, Rollout Plan, and Open Items & Out of Scope.
2. Target Users & Permissions includes a markdown table with Role / Can View / Can Act columns for at least the "job seeker" role.
3. KPIs & Success Metrics includes at least one KPI with a "Measured by:" line.
4. Use Cases & Requirements includes at least one use case written as "As a ... I want ... so that ..." with a fenced ```gherkin``` Given/When/Then block.
5. A "Readiness Checklist" appears (after Open Items & Out of Scope, followed by a final "## Decision Log" section — the skill's template puts Decision Log last, so do not fail for content appearing after the checklist) containing the 8 fixed checklist items from the skill's template, with most items checked `[x]` given how complete the PM's input was (a couple of `[ ]` items are acceptable if something was genuinely left open, but do not fail solely for that).

List any of 1-5 that fail.
