# Technical-debt mode

Use for remediation that improves system health, reduces engineering cost or risk, or removes constraints on future work. Connect the technical problem to its operational, engineering, or business consequences without requiring a customer feature narrative.

## Category catalog

Use these categories for review-scope selection and the discovery interview. Use IDs 1–4 in the first multi-select question and 5–7 in the second unless the user already selected a scope. IDs are catalog references, not required epic headings or a fixed count of readiness checks. Optional categories remain conditional even when selected.

| ID | Label | Description / readiness requirement |
|---|---|---|
| 1 | Problem & evidence | Current debt, supporting evidence, impact, cost of inaction, and why address it now. |
| 2 | Technical Constraints & External Dependencies | Optional: already-agreed constraints or external dependencies that materially limit scope or feasibility. |
| 3 | Context & target state | Current problem context and the desired observable capabilities or qualities. |
| 4 | Metrics & verification | Available baselines, agreed targets, and reproducible or auditable evidence of success. |
| 5 | Acceptance criteria | Testable outcomes, with compatibility, integrity, and failure behavior where relevant. |
| 6 | Scope & non-goals | Boundaries of the required outcome and explicit exclusions. |
| 7 | Definition of done | A brief statement of observable completion and required evidence, when it adds clarity. |

## Discovery prompts

Pick the most useful unresolved thread during the interview; do not ask every prompt or repeat answers already supplied:

- What evidence shows this is causing harm or constraining the team today?
- What happens if this remains unchanged for another six months?
- Is there an already-agreed constraint or external dependency that limits the outcome?
- What must keep working while the change is introduced?
- What evidence would demonstrate that the debt has been retired?

## Drafting rules

### Problem & evidence

Distinguish observed evidence from hypotheses. Use supplied incidents, latency/error data, recurring toil, change lead time, unsupported dependencies, security findings, or maintenance burden when relevant. Reference the source and date when known. Identify the cost of inaction and reason for timing without inventing incidents, quantified savings, or risk severity. Explore missing evidence during discovery; if it remains unavailable or deferred, record the uncertainty and its effect on assessing the problem, then continue to drafting.

### Technical Constraints & External Dependencies — optional

Include only when an already-agreed constraint or external dependency materially limits the scope or feasibility of the required outcome. Examples include a compliance requirement, fixed external contract, required cross-team approval, immutable platform limitation, or a delivery-blocking dependency. State the constraint or dependency and why it matters. Prefer a brief confirmed constraint beside its relevant acceptance criterion when clearer than a standalone section; do not repeat it solely to fill this section.

Do not collect a systems inventory or require identification of components, system owners, repositories, runtimes, integrations, tools, or channels. A source mentioning an existing organizational tool does not establish a dependency. Do not turn candidate implementation components, service architecture, integration designs, maintenance models, or handovers into constraint entries. Include design detail only when explicitly requested, or when an already-decided constraint is essential to verifying the outcome.

If no qualifying constraint is established, omit this section without a TBD, ownership question, Not applicable approval, or readiness blocker. An unresolved outcome decision can still be an open item without being presented as an agreed constraint.

### Context & target state

Describe the current problem context and the intended observable end state. Prioritize what must improve and why. Keep candidate implementation choices, architecture, tools, repositories, agent runtimes, integration mechanics, rollout mechanics, and maintenance models outside the epic unless design detail is explicitly requested or an already-decided constraint is essential to verifying the outcome. The shared prohibition on assigning responsibility still applies when design detail is requested. Do not add design alternatives merely because they appear in source material. Preserve real unresolved decisions that materially affect the outcome, scope, feasibility, or verification as open items.

### Metrics & verification

For each agreed success measure, record:

- **Baseline:** Current value and evidence when available; flag a gap if it affects evaluation of the agreed measure.
- **Target:** Agreed threshold and applicable workload, environment, and observation window; mark missing decisions TBD.
- **Measured by:** Supplied or agreed test report, operational signal, or other reproducible or auditable evidence. Do not invent commands, dashboards, tooling, or instrumentation designs.

Choose measures relevant to the debt: reliability, latency, resource cost, vulnerability exposure, build/test time, engineering toil, maintainability, or dependency retirement. Do not force every dimension into every epic. Distinguish functional verification from longer-term outcome measurement. If evidence arrives after deployment, preserve an agreed observation window or record the missing window as an open decision rather than claiming immediate completion. Do not request or assign responsibility for measurement. When no success measure was supplied or agreed, use available acceptance evidence and identify only material measurement gaps; do not manufacture a metric catalog.

### Acceptance criteria

Make acceptance criteria the primary requirements structure. Use the heading `## Acceptance Criteria` and group criteria under concise outcome-based headings that a reviewer can understand immediately, such as `### System-down alerting`, `### AI-assisted front-end development`, or `### Support first-response agent`. Use an engineering objective directly; do not force an artificial user story or label the groups remediation workstreams.

Do not prefix headings with identifiers such as TD-1 by default. Include identifiers only for a clear user-requested purpose, such as later backlog decomposition, and keep the outcome name prominent.

Capture compatibility, data integrity, failure handling, and system-quality requirements when relevant. Technical criteria can reference existing system events, APIs, schemas, dependencies, or tests when necessary to prove the outcome; they do not need a visible UI change or five-minute live demo. Describe the required result without prescribing implementation tasks. Preserve responsibility only when explicitly required as a verifiable acceptance criterion, narrowly in that criterion; do not propagate it into other sections.

Use this format:

````markdown
## Acceptance Criteria

### [Outcome name]
**Objective:** [Technical outcome and why it matters.]
```gherkin
Scenario: [Verification scenario]
  Given [defined system state and environment]
  When [operation, workload, deployment, migration, or failure event]
  Then [measurable system outcome]
```
**Verified by:** [Available or agreed test, report, metric, or reviewable evidence.]
````

Use `Scenario Outline` with `Examples` for input-only variations. Place shared criteria under **Shared Acceptance Criteria**. Unlike Product mode, `When` may be a system event and `Then` may be technical evidence. The scenario must be reproducible or auditable. Never invent commands, test results, schemas, or numeric targets. If a necessary threshold or behavior is undecided, mark that portion TBD and explain its effect on verification; preserve the rest of the criterion.

### Scope & non-goals

State boundaries of the required outcome and preserve explicit exclusions. Do not infer exclusions from optional omissions or from topics not discussed. Keep delivery tasks and implementation plans out of this section. There is no mandatory migration, rollout, or recovery plan. Preserve an agreed compatibility, integrity, safety, or recovery outcome as a criterion or essential constraint when relevant; if implementation planning is explicitly requested, describe irreversible operations accurately rather than promising rollback.

### Definition of done

When useful, briefly summarize observable completion and required evidence without duplicating the acceptance criteria. Include retirement of obsolete paths or dependencies and closure of temporary compatibility arrangements when part of the required outcome. Distinguish completion from follow-up outcomes and longer-term measurements without assigning responsibility. Do not add runbooks, maintenance handovers, or operational processes by default. Do not use "refactoring complete" or "tests pass" as the sole proof when the debt outcome remains unverified.

## Output order

After the interview and internal analysis, generate the complete epic without category-by-category approval. After the shared title, mode, draft status, and review-scope metadata, include only selected substantive sections in this order and preserve existing unselected content. Optional inclusion rules still apply:

1. Technical Problem, Evidence & Impact (category 1).
2. Desired Outcome (3).
3. Acceptance Criteria (5), with outcome headings and shared criteria when needed.
4. Success Metrics & Verification (4), when available or when a material measurement decision must be recorded.
5. Scope Boundaries & Non-Goals (6).
6. Technical Constraints & External Dependencies (2), only when the inclusion rule above is met and inline placement is insufficient.
7. Definition of Done (7), when a brief completion summary adds clarity.

Then append the shared Open Items & Out of Scope, Readiness Checklist, and Decision Log sections from `SKILL.md`.
