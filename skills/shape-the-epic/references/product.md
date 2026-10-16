# Product mode

Use for customer-facing or internal product features. Frame the epic around user needs, business outcomes, and observable product behavior.

## Category catalog

Use IDs 1–4 in the first multi-select question and 5–7 in the second, unless the user already selected a review scope. Labels are the option labels; descriptions explain the choice.

| ID | Label | Description / readiness requirement |
|---|---|---|
| 1 | Value proposition | Business problem, who benefits, and expected outcome. |
| 2 | Users & permissions | Internal and customer roles, what each can view, and what each can act on. |
| 3 | What & Why | Two plain internal-facing sentences explaining what changes and why it matters. |
| 4 | KPIs & metrics | Measurable success thresholds and the events or data needed to measure each. |
| 5 | Use cases & requirements | Happy paths, edge/error cases, and non-functional needs with acceptance criteria. |
| 6 | Rollout plan | Release strategy and dependencies, or an explicit Not applicable reason. |
| 7 | Definition of done | One or two management-facing sentences describing observable completion. |

## Discovery prompts

Pick the most useful unresolved thread; do not ask every prompt:

- Why does this need to exist now?
- Who experiences the problem, and what does it look like in their day?
- What is the simplest version worth building?
- What has prevented the problem from being solved before?
- What will look or work differently once this is live?

## Drafting rules

For **Users & permissions**, draft separate Internal Users and Customer Users tables where applicable, with `Role | Can View | Can Act`. Keep known roles even when permissions are unknown; mark unknown cells TBD. Do not invent customer roles for an internal-only feature.

For **KPIs & metrics**, give each KPI a threshold and a `Measured by:` line identifying the event or data point required. Include a baseline when supplied; mark missing values as open rather than inventing them. Add an `Additional Data Requirements` subsection for agreed needs such as audit logs, retention, or event capture that do not serve a particular KPI. Write `None noted.` if none were identified; do not add requirements speculatively.

## Use cases and acceptance criteria

Present the complete use-case draft as one section, grouped in this order:

1. Happy-path flows.
2. Edge and error cases, describing the affected user's recovery or understanding.
3. Non-functional requirements, tied to a user or business outcome.

Use this format:

````markdown
### UC-1: [Short name]
**As a** [role], **I want** [action or quality], **so that** [outcome].

[Optional context or constraint, only when needed.]

**Acceptance Criteria:**
```gherkin
Scenario: [Name]
  Given [realistic user starting state]
  When [real user action]
  Then [observable outcome]
```
````

Place shared scenarios in **Cross-Use-Case Acceptance Criteria** rather than repeating them.

- `Given` describes a realistic state a user can encounter.
- `When` describes a user action such as click, submit, navigate, or enter, rather than an internal trigger.
- `Then` describes a result a reviewer can see or confirm. Keep implementation mechanics out of product acceptance criteria.
- Prefer a small proof-of-delivery set that an engineer can demonstrate, rather than exhaustive test coverage. Express non-functional targets measurably and show how their evidence can be reviewed.
- Use `Scenario Outline` with `Examples` when scenarios differ only by input values.

## Output order

After the interview and internal analysis, generate the complete epic without category-by-category approval. After the shared title, mode, draft status, and review-scope metadata, include only selected substantive sections in this order and preserve existing unselected content:

1. What & Why (category 3).
2. Definition of Done (7).
3. Problem & Value Proposition (1).
4. Target Users & Permissions (2), with applicable role tables.
5. KPIs & Success Metrics (4), including Additional Data Requirements.
6. Use Cases & Requirements (5), including shared acceptance criteria.
7. Rollout Plan (6).

Then append the shared Open Items & Out of Scope, Readiness Checklist, and Decision Log sections from `SKILL.md`.
