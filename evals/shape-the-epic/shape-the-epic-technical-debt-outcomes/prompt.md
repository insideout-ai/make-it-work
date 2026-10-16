---
tags: [shape-the-epic, technical-debt]
allowed_tools: [Write, Edit, Read, AskUserQuestion]
max_turns: 30
timeout_seconds: 600
runs: 1
---

/make-it-work:shape-the-epic

We have completed the discovery interview for a Technical-debt epic titled Engineering response quality. All applicable categories were selected. Here are the interview notes, including the decisions we deferred; please generate the complete epic from them. The current working directory is the project root.

Problem and evidence: Dana reported that two September outage exercises were not detected until a customer contacted support. Omar reported that staff repeatedly reconstruct context for first support responses. These are exercise observations and qualitative reports, not measured production incident rates or measured time savings.

Required outcomes:
- System-down alerting: a representative complete service outage produces an actionable notification within two minutes, including affected capability and detection time. We explicitly deferred false-positive and partial-degradation policies.
- AI-assisted front-end development: a representative UI change can be completed with AI assistance and still meets the existing accessibility and regression checks. No model, vendor, runtime, or integration choice has been made.
- Support first-response agent: on a supplied reference set, the assistant produces a draft grounded in the supplied support knowledge, labels missing information, and does not send responses to customers. We explicitly deferred quality thresholds for that reference set.

Already-agreed constraint: customer content cannot be used in an AI pilot before privacy review approval.

For the support pilot, the reference-set evaluation evidence must contain Mira's recorded approval before support-response drafts are used.

Background discussion: we happen to use Slack, GitHub, Jira, and AWS today. Omar suggested comparing a Node agent with a Python worker, and Dana wondered whether a new alerting service would help. No approach was selected. Mira attended the discussion.

Scope exclusions: no automatic customer replies, replacement of the support platform, or organization-wide AI rollout. No repositories, service architecture, rollout steps, or maintenance arrangements have been decided. Please shape the epic from this context.
