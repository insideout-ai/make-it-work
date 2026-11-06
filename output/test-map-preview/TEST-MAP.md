# Test Map — Sprint Guide

> Review preview made from the existing JSON. No project tooling or test mappings were changed.

Source: [.claude/testing/test-map.json](<../../../insideoutai-sprint-guide/.claude/testing/test-map.json>). This is a snapshot of the saved map, not a new test assessment.

## At a glance

| Indexed tests | Mapped relationships | Relationships needing review | Assessed use cases / domains |
| ---: | ---: | ---: | ---: |
| 42 | 36 | 8 | 8 of 35 |

**Discovery is incomplete.** “Not assessed” means the saved map has not established test relevance for that feature; it does not mean tests are missing. A mapped test is relevant to a feature, but does not establish complete coverage. No tests were run to produce this preview.

[Feature overview](#feature-overview) · [Needs review](#needs-review) · [Test catalog and evidence](#test-catalog-and-evidence) · [Discovery scope](#discovery-scope)

## Feature overview

Each test reference opens its exact identity, file, selector, and mapping evidence below. A test can map to multiple features, so row counts are not additive.

### Use cases

| Feature | Assessment in saved map | Mapped tests | Needs review |
| --- | --- | --- | --- |
| [UC-01 · Login & Auth Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-01-login/SKILL.md>) | Not assessed | — | — |
| [UC-02 · Connect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-02-connect-jira/SKILL.md>) | Not assessed | — | — |
| [UC-03 · Select Jira Site](<../../../insideoutai-sprint-guide/.claude/skills/uc-03-select-site/SKILL.md>) | Not assessed | — | — |
| [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>) | Assessed | [T23](#t23), [T29](#t29), [T32](#t32), [T40](#t40) | [T14](#t14) |
| [UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>) | Assessed | [T01](#t01), [T24](#t24), [T39](#t39) | [T14](#t14) |
| [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>) | Assessed | [T02](#t02), [T16](#t16), [T38](#t38), [T41](#t41), [T42](#t42) | [T15](#t15), [T30](#t30) |
| [UC-07 · View Sprint Dashboard](<../../../insideoutai-sprint-guide/.claude/skills/uc-07-view-sprint-dashboard/SKILL.md>) | Not assessed | — | — |
| [UC-08 · Filter Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-08-filter-data/SKILL.md>) | Not assessed | — | — |
| [UC-09 · View Health Score](<../../../insideoutai-sprint-guide/.claude/skills/uc-09-view-health-score/SKILL.md>) | Not assessed | — | — |
| [UC-10 · View Velocity](<../../../insideoutai-sprint-guide/.claude/skills/uc-10-view-velocity/SKILL.md>) | Not assessed | — | — |
| [UC-11 · Plan Next Sprint](<../../../insideoutai-sprint-guide/.claude/skills/uc-11-plan-next-sprint/SKILL.md>) | Not assessed | — | — |
| [UC-12 · View Daily Insights](<../../../insideoutai-sprint-guide/.claude/skills/uc-12-view-daily-insights/SKILL.md>) | Not assessed | — | — |
| [UC-13 · View Retrospective](<../../../insideoutai-sprint-guide/.claude/skills/uc-13-view-retrospective/SKILL.md>) | Not assessed | — | — |
| [UC-14 · Report Problem](<../../../insideoutai-sprint-guide/.claude/skills/uc-14-report-problem/SKILL.md>) | Assessed | [T12](#t12) | — |
| [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>) | Assessed | [T09](#t09), [T10](#t10), [T37](#t37) | [T11](#t11), [T20](#t20), [T31](#t31) |
| [UC-16 · Submit Idea](<../../../insideoutai-sprint-guide/.claude/skills/uc-16-submit-idea/SKILL.md>) | Not assessed | — | — |
| [UC-17 · Admin Manage Ideas & Problems](<../../../insideoutai-sprint-guide/.claude/skills/uc-17-admin-manage/SKILL.md>) | Not assessed | — | — |
| [UC-18 · Admin Send Emails](<../../../insideoutai-sprint-guide/.claude/skills/uc-18-admin-send-emails/SKILL.md>) | Not assessed | — | — |

### Domains

| Feature | Assessment in saved map | Mapped tests | Needs review |
| --- | --- | --- | --- |
| [Admin](<../../../insideoutai-sprint-guide/.claude/skills/domain-admin/SKILL.md>) | Not assessed | — | — |
| [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | Assessed | [T24](#t24), [T30](#t30), [T32](#t32), [T33](#t33), [T39](#t39), [T40](#t40) | — |
| [Bugs Trend](<../../../insideoutai-sprint-guide/.claude/skills/domain-bugs-trend/SKILL.md>) | Not assessed | — | — |
| [Compare Team Members](<../../../insideoutai-sprint-guide/.claude/skills/domain-compare-team/SKILL.md>) | Not assessed | — | — |
| [Cycle Time](<../../../insideoutai-sprint-guide/.claude/skills/domain-cycle-time/SKILL.md>) | Not assessed | — | — |
| [Epics Timeline (Epic's View data)](<../../../insideoutai-sprint-guide/.claude/skills/domain-epics-roadmap/SKILL.md>) | Not assessed | — | — |
| [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Assessed | [T09](#t09), [T10](#t10), [T12](#t12), [T24](#t24), [T25](#t25), [T26](#t26), [T35](#t35), [T37](#t37), [T39](#t39) | [T34](#t34) |
| [Export People Performance](<../../../insideoutai-sprint-guide/.claude/skills/domain-export-people-performance/SKILL.md>) | Not assessed | — | — |
| [Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>) | Assessed | [T02](#t02), [T16](#t16), [T38](#t38), [T41](#t41), [T42](#t42) | — |
| [Filtering](<../../../insideoutai-sprint-guide/.claude/skills/domain-filtering/SKILL.md>) | Not assessed | — | — |
| [Gamification](<../../../insideoutai-sprint-guide/.claude/skills/domain-gamification/SKILL.md>) | Not assessed | — | — |
| [Health Score](<../../../insideoutai-sprint-guide/.claude/skills/domain-health-score/SKILL.md>) | Not assessed | — | — |
| [Idea & Feedback](<../../../insideoutai-sprint-guide/.claude/skills/domain-idea-feedback/SKILL.md>) | Not assessed | — | — |
| [Payment Reminder](<../../../insideoutai-sprint-guide/.claude/skills/domain-payment-reminder/SKILL.md>) | Not assessed | — | — |
| [Scrum Events](<../../../insideoutai-sprint-guide/.claude/skills/domain-scrum-events/SKILL.md>) | Not assessed | — | — |
| [Sprint Data](<../../../insideoutai-sprint-guide/.claude/skills/domain-sprint-data/SKILL.md>) | Not assessed | — | — |
| [Velocity](<../../../insideoutai-sprint-guide/.claude/skills/domain-velocity/SKILL.md>) | Not assessed | — | — |

## Needs review

These candidate relationships remain unresolved. They are excluded from the mapped-test lists above.

### 1. [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)

**Test:** [T11](#t11) — JiraHealthCheck > standalone rendering keeps its own card title

**Why unresolved:** The test asserts only that the standalone card title text renders; UC-15 documents running the check and its results, not the card heading, so relevance to the use case is not established.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 2. [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)

**Test:** [T14](#t14) — Privacy multi-part collapsible sections > expands and collapses Data Management

**Why unresolved:** The test asserts only that the Disconnect Account and Delete All Data buttons appear and disappear with the section; it does not exercise the disconnect flow.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 3. [UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>)

**Test:** [T14](#t14) — Privacy multi-part collapsible sections > expands and collapses Data Management

**Why unresolved:** The test asserts only that the Disconnect Account and Delete All Data buttons appear and disappear with the section; it does not exercise the deletion flow.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 4. [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)

**Test:** [T15](#t15) — Privacy multi-part collapsible sections > keeps Jira Field Configuration collapsed even when the Story Points field has no data

**Why unresolved:** The test asserts only that the section stays collapsed and the zero-coverage hint is hidden; it does not exercise field selection or discovery, so relevance beyond UI structure is not established.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 5. [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)

**Test:** [T20](#t20) — Privacy multi-part collapsible sections > shows the health check only inside its expanded section

**Why unresolved:** JiraHealthCheck is mocked in this suite; the test asserts only that its placeholder is hidden until the section expands, not the health check flow.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 6. [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)

**Test:** [T30](#t30) — Privacy settings > preserves sibling settings across consecutive preference updates

**Why unresolved:** The legacy annotation names UC-06, but the test toggles health-metric and velocity preferences stored in sprint_analysis_config, not Story Points or Team field selection; relevance to field configuration is not established.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 7. [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)

**Test:** [T31](#t31) — Privacy settings > renders connected settings and cached status context

**Why unresolved:** The test mocks JiraHealthCheck and asserts only that it is mounted with the site URL; it does not exercise the health check flow.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

### 8. [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

**Test:** [T34](#t34) — Privacy single-control collapsible sections > collapses Velocity, Diagnostics and Working Week but keeps their controls in the header

**Why unresolved:** The test asserts collapsed-state structure and control visibility for three sections; only the diagnostics switch belongs to the domain and no diagnostics behavior is exercised.

**Review action:** inspect the assertions against this feature’s contract, then confirm or reject the relationship.

## Test catalog and evidence

Test names and selectors below are copied from the JSON. Selectors are runner arguments, not standalone commands.

<a id="t01"></a>

### T01 · deleteMyJiraData behavior > completes account cleanup after a partial report batch

**File:** [base44/functions/deleteMyJiraData/behavior.test.ts](<../../../insideoutai-sprint-guide/base44/functions/deleteMyJiraData/behavior.test.ts>)

**Mapped to:** [UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "deleteMyJiraData behavior completes account cleanup after a partial report batch"
```

**[UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/deleteMyJiraData/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/deleteMyJiraData/entry.ts>) | Deno.serve | The test drives the handler that anonymizes reports and then cleans up the account after a final partial batch, which is the permanent deletion UC-05 describes. |
| [.claude/skills/uc-05-delete-data/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>) | What the User Sees | Defines the deletion outcome the backend completion asserts. |

</details>

<a id="t02"></a>

### T02 · updateStoryPointsField behavior > updates an available field and preserves the success response

**File:** [base44/functions/updateStoryPointsField/behavior.test.ts](<../../../insideoutai-sprint-guide/base44/functions/updateStoryPointsField/behavior.test.ts>)

**Mapped to:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>); [Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "updateStoryPointsField behavior updates an available field and preserves the success response"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/updateStoryPointsField/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/updateStoryPointsField/entry.ts>) | Deno.serve | The test asserts that a field chosen from the cached available fields is persisted, which is the manual Story Points selection step of UC-06. |
| [.claude/skills/uc-06-configure-fields/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>) | Manual Selection (Privacy page) | Defines manual SP-field selection. |

**[Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/updateStoryPointsField/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/updateStoryPointsField/entry.ts>) | Deno.serve | Validates the chosen SP field against available fields and writes the User entity. |
| [.claude/skills/domain-field-config/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>) | Manual selection | Documents updateStoryPointsField as the domain's manual-selection function. |

</details>

<a id="t03"></a>

### T03 · CollapsibleSection > expands and collapses from the header

**File:** [src/components/CollapsibleSection.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/CollapsibleSection.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "CollapsibleSection expands and collapses from the header"
```

</details>

<a id="t04"></a>

### T04 · CollapsibleSection > keeps a header control usable without toggling the section

**File:** [src/components/CollapsibleSection.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/CollapsibleSection.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "CollapsibleSection keeps a header control usable without toggling the section"
```

</details>

<a id="t05"></a>

### T05 · CollapsibleSection > keeps each section open or closed independently

**File:** [src/components/CollapsibleSection.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/CollapsibleSection.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "CollapsibleSection keeps each section open or closed independently"
```

</details>

<a id="t06"></a>

### T06 · CollapsibleSection > preserves content state while the section is collapsed

**File:** [src/components/CollapsibleSection.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/CollapsibleSection.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "CollapsibleSection preserves content state while the section is collapsed"
```

</details>

<a id="t07"></a>

### T07 · CollapsibleSection > starts collapsed showing only the title and one-line description

**File:** [src/components/CollapsibleSection.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/CollapsibleSection.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "CollapsibleSection starts collapsed showing only the title and one-line description"
```

</details>

<a id="t08"></a>

### T08 · CollapsibleSection > toggles with Enter and Space on the focused header

**File:** [src/components/CollapsibleSection.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/CollapsibleSection.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "CollapsibleSection toggles with Enter and Space on the focused header"
```

</details>

<a id="t09"></a>

### T09 · JiraHealthCheck > embedded rendering drops the duplicate card title but keeps the actions and results

**File:** [src/components/JiraHealthCheck.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.component.test.jsx>)

**Mapped to:** [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>); [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "JiraHealthCheck embedded rendering drops the duplicate card title but keeps the actions and results"
```

**[UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/components/JiraHealthCheck.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.jsx>) | JiraHealthCheck | With the embedded prop the test asserts the card title is dropped while Run Tests and Fetch Issues stay available and clicking Run Tests still shows the '1/3 passed' result summary, i.e. the health check still runs and displays its results. |
| [.claude/skills/uc-15-run-health-check/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>) | What the User Sees | Defines the run-and-display-results flow that remains intact when the component is embedded in a collapsible Privacy section. |

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/components/JiraHealthCheck.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.jsx>) | JiraHealthCheck | The exercised component is the Jira health check whose actions and result summary the test asserts remain functional when embedded. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Health check | Assigns JiraHealthCheck on the Privacy page and its expandable pass/fail results to this domain. |

</details>

<a id="t10"></a>

### T10 · JiraHealthCheck > runs the diagnostic suite and expands individual results

**File:** [src/components/JiraHealthCheck.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.component.test.jsx>)

**Mapped to:** [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>); [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "JiraHealthCheck runs the diagnostic suite and expands individual results"
```

**[UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/components/JiraHealthCheck.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.jsx>) | JiraHealthCheck | The test runs the check and expands pass/fail results, which is the UC-15 Run Health Check flow rendered by the Privacy page. |
| [.claude/skills/uc-15-run-health-check/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>) | What the User Sees | Defines the health check result display. |

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/components/JiraHealthCheck.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.jsx>) | JiraHealthCheck | The exercised component is the health-check UI that the domain assigns to error-support diagnostics. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Health check | Assigns JiraHealthCheck on the Privacy page to this domain. |

</details>

<a id="t11"></a>

### T11 · JiraHealthCheck > standalone rendering keeps its own card title

**File:** [src/components/JiraHealthCheck.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/JiraHealthCheck.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

**Needs review:** [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "JiraHealthCheck standalone rendering keeps its own card title"
```

**[UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)** — unresolved; source: inferred.

The test asserts only that the standalone card title text renders; UC-15 documents running the check and its results, not the card heading, so relevance to the use case is not established.

No supporting evidence recorded.

</details>

<a id="t12"></a>

### T12 · MyProblemsDialog > loads only the current user reports and renders safe summary fields

**File:** [src/components/MyProblemsDialog.component.test.jsx](<../../../insideoutai-sprint-guide/src/components/MyProblemsDialog.component.test.jsx>)

**Mapped to:** [UC-14 · Report Problem](<../../../insideoutai-sprint-guide/.claude/skills/uc-14-report-problem/SKILL.md>); [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "MyProblemsDialog loads only the current user reports and renders safe summary fields"
```

**[UC-14 · Report Problem](<../../../insideoutai-sprint-guide/.claude/skills/uc-14-report-problem/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/components/MyProblemsDialog.jsx](<../../../insideoutai-sprint-guide/src/components/MyProblemsDialog.jsx>) | MyProblemsDialog | The test asserts the user's own past reports are listed with safe fields, which is the My Problems section reachable from the Privacy page. |
| [.claude/skills/uc-14-report-problem/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-14-report-problem/SKILL.md>) | What the User Sees | Step 4 documents past reports viewable via My Problems on the Privacy page. |

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/components/MyProblemsDialog.jsx](<../../../insideoutai-sprint-guide/src/components/MyProblemsDialog.jsx>) | MyProblemsDialog | Lists ProblemReport records of the current user. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Problem reports | MyProblemsDialog and ProblemReport belong to this domain. |

</details>

<a id="t13"></a>

### T13 · Privacy multi-part collapsible sections > does not remember which sections were open

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections does not remember which sections were open"
```

</details>

<a id="t14"></a>

### T14 · Privacy multi-part collapsible sections > expands and collapses Data Management

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

**Needs review:** [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>); [UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections expands and collapses Data Management"
```

**[UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)** — unresolved; source: inferred.

The test asserts only that the Disconnect Account and Delete All Data buttons appear and disappear with the section; it does not exercise the disconnect flow.

No supporting evidence recorded.

**[UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>)** — unresolved; source: inferred.

The test asserts only that the Disconnect Account and Delete All Data buttons appear and disappear with the section; it does not exercise the deletion flow.

No supporting evidence recorded.

</details>

<a id="t15"></a>

### T15 · Privacy multi-part collapsible sections > keeps Jira Field Configuration collapsed even when the Story Points field has no data

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

**Needs review:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections keeps Jira Field Configuration collapsed even when the Story Points field has no data"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — unresolved; source: inferred.

The test asserts only that the section stays collapsed and the zero-coverage hint is hidden; it does not exercise field selection or discovery, so relevance beyond UI structure is not established.

No supporting evidence recorded.

</details>

<a id="t16"></a>

### T16 · Privacy multi-part collapsible sections > keeps Jira Field Configuration open and visible while Run Auto-Discovery runs

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>); [Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections keeps Jira Field Configuration open and visible while Run Auto-Discovery runs"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | deepDiscoverJiraFields | The test expands Jira Field Configuration, clicks Run Auto-Discovery, asserts the section stays open with the scanning indicator visible while deepDiscoverJiraFields is pending, then asserts the 'Deep scan complete' result. |
| [.claude/skills/uc-06-configure-fields/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>) | Deep Search | Defines the user-triggered field scan with visible progress and a result the user can accept; the Privacy page's Run Auto-Discovery button implements it. |

**[Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | deepDiscoverJiraFields | The test drives the Privacy deep-discovery loop through the mocked deepDiscoverJiraFields call to its completion message. |
| [.claude/skills/domain-field-config/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>) | Data Flows | Documents Privacy.jsx deep discovery via deepDiscoverJiraFields as a field-config workflow, noting the Run Auto-Discovery button calls it. |

</details>

<a id="t17"></a>

### T17 · Privacy multi-part collapsible sections > leaves Connection Information, My Ideas & Reports and Status Distribution unchanged

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections leaves Connection Information, My Ideas & Reports and Status Distribution unchanged"
```

</details>

<a id="t18"></a>

### T18 · Privacy multi-part collapsible sections > opens sections independently of each other

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections opens sections independently of each other"
```

</details>

<a id="t19"></a>

### T19 · Privacy multi-part collapsible sections > shows all four privacy commitments with their full wording when expanded

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections shows all four privacy commitments with their full wording when expanded"
```

</details>

<a id="t20"></a>

### T20 · Privacy multi-part collapsible sections > shows the health check only inside its expanded section

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

**Needs review:** [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections shows the health check only inside its expanded section"
```

**[UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)** — unresolved; source: inferred.

JiraHealthCheck is mocked in this suite; the test asserts only that its placeholder is hidden until the section expands, not the health check flow.

No supporting evidence recorded.

</details>

<a id="t21"></a>

### T21 · Privacy multi-part collapsible sections > starts with all eight sections collapsed and their details hidden

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections starts with all eight sections collapsed and their details hidden"
```

</details>

<a id="t22"></a>

### T22 · Privacy multi-part collapsible sections > toggles a section with the keyboard

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy multi-part collapsible sections toggles a section with the keyboard"
```

</details>

<a id="t23"></a>

### T23 · Privacy settings > closes the disconnect confirmation without calling the backend when cancelled

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy settings closes the disconnect confirmation without calling the backend when cancelled"
```

**[UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | The test opens the Disconnect Account confirmation, cancels, and asserts disconnectJira is not called: the UC-04 alternative flow. |
| [.claude/skills/uc-04-disconnect-jira/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>) | Alternative / Error Flows | Defines cancel behavior. |

</details>

<a id="t24"></a>

### T24 · Privacy settings > continues deletion until all anonymization batches are complete

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>); [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>); [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (3 relationships)</summary>

**Recorded selector:**

```text
-t "Privacy settings continues deletion until all anonymization batches are complete"
```

**[UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | The test confirms Delete All Data and asserts deleteMyJiraData is repeated until complete, then the success message is shown. |
| [.claude/skills/uc-05-delete-data/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>) | What the User Sees | Defines the deletion flow and outcome. |

**[Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | Invokes deleteMyJiraData from the Privacy page. |
| [.claude/skills/domain-auth/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | Function table | Lists deleteMyJiraData (GDPR deletion) under the auth domain and UC-05 under its use cases. |

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | The loop continues while anonymization batches are incomplete. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Privacy | Documents that GDPR deletion anonymizes stored reports in batches before completing account cleanup. |

</details>

<a id="t25"></a>

### T25 · Privacy settings > defaults extended automatic diagnostics to enabled and saves an opt-out

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy settings defaults extended automatic diagnostics to enabled and saves an opt-out"
```

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | automaticErrorReportingEnabled | The test asserts the switch defaults on and saves automatic_error_reporting_enabled=false. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Privacy | Documents automatic reporting as an opt-out control (automatic_error_reporting_enabled). |

</details>

<a id="t26"></a>

### T26 · Privacy settings > discloses organization-level client error metrics without claiming they are anonymous

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy settings discloses organization-level client error metrics without claiming they are anonymous"
```

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Send extended diagnostics automatically | The test asserts the diagnostics and client 4xx metrics disclosure copy that sits under the diagnostics switch. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Privacy | Domain owns the automatic-diagnostics privacy contract. |

</details>

<a id="t27"></a>

### T27 · Privacy settings > distinguishes a failed settings lookup from a disconnected Jira account

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy settings distinguishes a failed settings lookup from a disconnected Jira account"
```

</details>

<a id="t28"></a>

### T28 · Privacy settings > keeps settings hidden while the user lookup is pending

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy settings keeps settings hidden while the user lookup is pending"
```

</details>

<a id="t29"></a>

### T29 · Privacy settings > locks the disconnect confirmation while the backend request is pending

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy settings locks the disconnect confirmation while the backend request is pending"
```

**[UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | The test asserts the confirm button is disabled and disconnectJira is called once while the request is pending, then success is shown. |
| [.claude/skills/uc-04-disconnect-jira/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>) | What the User Sees | Defines the disconnect confirmation and success outcome. |

</details>

<a id="t30"></a>

### T30 · Privacy settings > preserves sibling settings across consecutive preference updates

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)

**Needs review:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "Privacy settings preserves sibling settings across consecutive preference updates"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — unresolved; source: inferred.

The legacy annotation names UC-06, but the test toggles health-metric and velocity preferences stored in sprint_analysis_config, not Story Points or Team field selection; relevance to field configuration is not established.

No supporting evidence recorded.

**[Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | sprint_analysis_config | The test asserts consecutive preference writes preserve marker/weekendDays keys of the User sprint_analysis_config JSON. |
| [.claude/skills/domain-auth/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | User entity schema | Documents sprint_analysis_config as a User entity JSON field. |

</details>

<a id="t31"></a>

### T31 · Privacy settings > renders connected settings and cached status context

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

**Needs review:** [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy settings renders connected settings and cached status context"
```

**[UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)** — unresolved; source: inferred.

The test mocks JiraHealthCheck and asserts only that it is mounted with the site URL; it does not exercise the health check flow.

No supporting evidence recorded.

</details>

<a id="t32"></a>

### T32 · Privacy settings > shows a recoverable error when Jira disconnection fails

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>); [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
-t "Privacy settings shows a recoverable error when Jira disconnection fails"
```

**[UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | The test asserts a failed then retried disconnect shows the error and then the success message. |
| [.claude/skills/uc-04-disconnect-jira/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>) | Alternative / Error Flows | Defines disconnect failure handling. |

**[Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | Privacy | Calls disconnectJira from the Privacy page. |
| [.claude/skills/domain-auth/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | Function table | Lists disconnectJira (clears jira_* fields) in the auth domain. |

</details>

<a id="t33"></a>

### T33 · Privacy settings > shows the disconnected state for a user without Jira

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy settings shows the disconnected state for a user without Jira"
```

**[Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | No Jira Connection | The test asserts a user with jira_connected=false sees the No Jira Connection state. |
| [.claude/skills/domain-auth/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | Connection state | Defines Jira-connected state from jira_connected. |

</details>

<a id="t34"></a>

### T34 · Privacy single-control collapsible sections > collapses Velocity, Diagnostics and Working Week but keeps their controls in the header

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

**Needs review:** [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>). See [Needs review](#needs-review).

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy single-control collapsible sections collapses Velocity, Diagnostics and Working Week but keeps their controls in the header"
```

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — unresolved; source: inferred.

The test asserts collapsed-state structure and control visibility for three sections; only the diagnostics switch belongs to the domain and no diagnostics behavior is exercised.

No supporting evidence recorded.

</details>

<a id="t35"></a>

### T35 · Privacy single-control collapsible sections > does not toggle a section when its header control is used

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (1 relationship)</summary>

**Recorded selector:**

```text
-t "Privacy single-control collapsible sections does not toggle a section when its header control is used"
```

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [src/pages/Privacy.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.jsx>) | automaticErrorReportingEnabled | The test clicks the header switch and asserts User.updateMyUserData is called with automatic_error_reporting_enabled=false while the section stays collapsed, so the opt-out write is the asserted behavior. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Privacy | Documents automatic reporting as an opt-out control (automatic_error_reporting_enabled) on the Privacy page. |

</details>

<a id="t36"></a>

### T36 · Privacy single-control collapsible sections > reveals the longer explanation when a single-control section is expanded

**File:** [src/pages/Privacy.component.test.jsx](<../../../insideoutai-sprint-guide/src/pages/Privacy.component.test.jsx>)

**Mapped to:** No mapped relationships recorded.

<details>
<summary>Recorded test selector</summary>

**Recorded selector:**

```text
-t "Privacy single-control collapsible sections reveals the longer explanation when a single-control section is expanded"
```

</details>

<a id="t37"></a>

### T37 · checkJiraApiHealth summarizes isolated Jira endpoint checks

**File:** [tests/base44-functions/checkJiraApiHealth_behavior_test.ts](<../../../insideoutai-sprint-guide/tests/base44-functions/checkJiraApiHealth_behavior_test.ts>)

**Mapped to:** [UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>); [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
--filter "checkJiraApiHealth summarizes isolated Jira endpoint checks"
```

**[UC-15 · Run Health Check](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/checkJiraApiHealth/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/checkJiraApiHealth/entry.ts>) | Deno.serve | The backend health-check handler whose per-check summary the UC-15 results display. |
| [.claude/skills/uc-15-run-health-check/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-15-run-health-check/SKILL.md>) | Health Check | Defines the sequential checks. |

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/checkJiraApiHealth/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/checkJiraApiHealth/entry.ts>) | Deno.serve | Health-check logic. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Health check | Assigns checkJiraApiHealth to this domain. |

</details>

<a id="t38"></a>

### T38 · deepDiscoverJiraFields discovers populated field candidates safely

**File:** [tests/base44-functions/deepDiscoverJiraFields_behavior_test.ts](<../../../insideoutai-sprint-guide/tests/base44-functions/deepDiscoverJiraFields_behavior_test.ts>)

**Mapped to:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>); [Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
--filter "deepDiscoverJiraFields discovers populated field candidates safely"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/deepDiscoverJiraFields/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/deepDiscoverJiraFields/entry.ts>) | Deno.serve | Discovers populated SP/team field candidates that the Privacy field-configuration UI offers. |
| [.claude/skills/uc-06-configure-fields/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>) | Deep Search | Defines deep search in UC-06. |

**[Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/deepDiscoverJiraFields/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/deepDiscoverJiraFields/entry.ts>) | Deno.serve | Paginated field candidate scan. |
| [.claude/skills/domain-field-config/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>) | Deep discovery | Documents deepDiscoverJiraFields as the domain's scan. |

</details>

<a id="t39"></a>

### T39 · deleteMyJiraData anonymizes reports before clearing Jira data

**File:** [tests/base44-functions/deleteMyJiraData_behavior_test.ts](<../../../insideoutai-sprint-guide/tests/base44-functions/deleteMyJiraData_behavior_test.ts>)

**Mapped to:** [UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>); [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>); [Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)

<details>
<summary>Selector and mapping evidence (3 relationships)</summary>

**Recorded selector:**

```text
--filter "deleteMyJiraData anonymizes reports before clearing Jira data"
```

**[UC-05 · Delete My Data](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/deleteMyJiraData/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/deleteMyJiraData/entry.ts>) | Deno.serve | Asserts report anonymization precedes credential/data clearing in the deletion handler. |
| [.claude/skills/uc-05-delete-data/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-05-delete-data/SKILL.md>) | What the User Sees | Defines the deletion outcome. |

**[Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/deleteMyJiraData/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/deleteMyJiraData/entry.ts>) | Deno.serve | Deletion handler. |
| [.claude/skills/domain-auth/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | Function table | Lists deleteMyJiraData under auth. |

**[Error Support](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/deleteMyJiraData/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/deleteMyJiraData/entry.ts>) | Deno.serve | Anonymizes ProblemReport records in batches. |
| [.claude/skills/domain-error-support/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-error-support/SKILL.md>) | Privacy | Documents batched report anonymization during GDPR deletion. |

</details>

<a id="t40"></a>

### T40 · disconnectJira isolates revocation, cleanup, and audit failures

**File:** [tests/base44-functions/disconnectJira_behavior_test.ts](<../../../insideoutai-sprint-guide/tests/base44-functions/disconnectJira_behavior_test.ts>)

**Mapped to:** [UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>); [Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
--filter "disconnectJira isolates revocation, cleanup, and audit failures"
```

**[UC-04 · Disconnect Jira](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/disconnectJira/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/disconnectJira/entry.ts>) | Deno.serve | Asserts credential removal, cleanup and failure isolation in the disconnect handler. |
| [.claude/skills/uc-04-disconnect-jira/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-04-disconnect-jira/SKILL.md>) | Cross-references | Links UC-04 to the token-cleanup implementation. |

**[Auth](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/disconnectJira/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/disconnectJira/entry.ts>) | Deno.serve | Disconnect handler. |
| [.claude/skills/domain-auth/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-auth/SKILL.md>) | Disconnect | Documents that disconnectJira clears jira_* fields and writes an AuditLog. |

</details>

<a id="t41"></a>

### T41 · updateStoryPointsField validates cached choices before persistence

**File:** [tests/base44-functions/updateStoryPointsField_behavior_test.ts](<../../../insideoutai-sprint-guide/tests/base44-functions/updateStoryPointsField_behavior_test.ts>)

**Mapped to:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>); [Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
--filter "updateStoryPointsField validates cached choices before persistence"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/updateStoryPointsField/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/updateStoryPointsField/entry.ts>) | Deno.serve | Asserts only an available SP field is persisted. |
| [.claude/skills/uc-06-configure-fields/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>) | Manual Selection (Privacy page) | Defines manual selection. |

**[Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/updateStoryPointsField/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/updateStoryPointsField/entry.ts>) | Deno.serve | Field validation and User write. |
| [.claude/skills/domain-field-config/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>) | Manual selection | Documents updateStoryPointsField. |

</details>

<a id="t42"></a>

### T42 · updateTeamField validates cached choices before persistence

**File:** [tests/base44-functions/updateTeamField_behavior_test.ts](<../../../insideoutai-sprint-guide/tests/base44-functions/updateTeamField_behavior_test.ts>)

**Mapped to:** [UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>); [Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)

<details>
<summary>Selector and mapping evidence (2 relationships)</summary>

**Recorded selector:**

```text
--filter "updateTeamField validates cached choices before persistence"
```

**[UC-06 · Configure Fields](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/updateTeamField/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/updateTeamField/entry.ts>) | Deno.serve | Asserts only an available team field is persisted. |
| [.claude/skills/uc-06-configure-fields/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/uc-06-configure-fields/SKILL.md>) | Manual Selection (Privacy page) | Defines manual team-field selection. |

**[Field Config](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>)** — mapped; source: inferred.

| Evidence file | Symbol / contract | Why it supports the relationship |
| --- | --- | --- |
| [base44/functions/updateTeamField/entry.ts](<../../../insideoutai-sprint-guide/base44/functions/updateTeamField/entry.ts>) | Deno.serve | Field validation and User write. |
| [.claude/skills/domain-field-config/SKILL.md](<../../../insideoutai-sprint-guide/.claude/skills/domain-field-config/SKILL.md>) | Manual selection | Documents updateTeamField. |

</details>

## Discovery scope

**Location `local`** — repository `insideoutai-sprint-guide`. Discovery complete: **no**.

**Registered search paths:** `src`, `base44/functions`, `tests`.

**Configuration inputs:** [package.json](<../../../insideoutai-sprint-guide/package.json>), [vitest.config.js](<../../../insideoutai-sprint-guide/vitest.config.js>), [playwright.config.js](<../../../insideoutai-sprint-guide/playwright.config.js>), [tests/base44-functions/deno.json](<../../../insideoutai-sprint-guide/tests/base44-functions/deno.json>), [src/test/setup.js](<../../../insideoutai-sprint-guide/src/test/setup.js>).

**Saved user decisions:** 0.

For runner commands and prerequisites, see [Test Strategy](<../../../insideoutai-sprint-guide/.claude/skills/test-strategy/SKILL.md>).

<details>
<summary>Source fingerprint</summary>

- Schema version: 1
- SHA-256 of source JSON: `58f6790cc2d575d03c3fda4344ac6f498ab95f57e8762a23019ac1df2e827f1a`
- This preview has no automatic regeneration command or synchronization configured.

</details>
