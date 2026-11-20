# Plan Template

Template for `plan-the-work`'s `### Plan structure` step. Reproduce this exact structure when writing a plan file — keep every section, writing "None" where empty rather than deleting it.

# Plan for <TICKET> — <feature-title>

**Test preparation contract:** 1

> **Spec:** `<resolved spec path>` · **Target branch:** `<branch>` · **For executors:** complete steps in order unless a step is marked **parallel**; do not proceed past a step until its **Verify** passes; do not edit files not listed in Affected Code; files under a `(test scope only)` section are editable test files only.

## What This Changes

3–6 sentences, plain business/technical language a non-implementer can follow: what will be different after this plan is executed, and why it matters. No file paths, function/class/method names, or code snippets — those live in Affected Code and Steps.

## Visual Overview

When it helps explain the change, include one compact fenced `mermaid` diagram with a short plain-language explanation. Choose a flow, sequence, architecture, or before/after diagram to clarify the relevant behavior, interactions or dependencies. Use plain-language labels and distinguish existing behavior from proposed changes where relevant. The written plan must remain understandable without rendering the diagram. For a simple change where a visual adds no clarity, write `None — <brief reason>`.

Keep the Mermaid source directly in this section; do not generate images, separate diagram files, or install rendering tools. Rendering depends on the Markdown viewer; the HTML preview shows Mermaid source.

## Execution Status

_This section is owned by `execute`, not `plan-the-work` — `plan-the-work` writes it once, verbatim, as part of the initial skeleton, and never edits it again. Everything below is written for whichever session runs `execute` against this plan._

**Mode:** Not yet chosen. Before doing anything else — even if you were only handed this file with no memory of it being created — ask the user to choose:
- **Subagent-Driven** — dispatch a fresh subagent per step (via the Agent tool), reviewed between steps.
- **Inline** — execute steps in this session, checkpointed after each step's Verify.

Do not invent a different execution strategy. Once chosen, update this line to the chosen mode.

**Progress:** Step 0 of N complete. `plan-the-work` replaces `N` with the final step count through `execute/scripts/plan-status.mjs set-total`; `execute` advances it through that script immediately after each step's Verify passes.

## Open Questions & Blockers

Resolve before starting. If none: _None — all questions resolved before planning._

## Decision Log

Questions asked during Step 4.5 and how they were resolved, in the order asked. If none were asked: _None — no planning questions were needed._

| Question | Gap Type | Answer |
| --- | --- | --- |
| [full question text as asked] | [gap type from Step 4.5's list] | [option the user picked, verbatim — or "Proceed with the recommended assumption"] |

## Goal

One paragraph, for the executor: the system's technical end-state after this plan runs — what changed at the code/data/interface level — and a link to the spec. (`What This Changes` above covers the same event for a non-technical reader; this section covers it for whoever implements it.)

## Requirement Summary

| | |
| --- | --- |
| **Business goal** | Who benefits and what problem it solves |
| **In scope** | What this plan covers |
| **Out of scope** | What it explicitly excludes |
| **Assumptions** | Anything inferred that the spec does not state |

## Approach

Key design decisions. Explain _why_ — alternatives considered and why rejected. The executor follows these without re-deriving them. No file paths, function/class/method names, or code snippets in this section — name approaches/patterns conceptually; file-level specifics belong in Affected Code and Steps only.

## Affected Code

### `<repo-name>`  <!-- one section per affected repo; a single-repo plan has just one; a test-only repo uses ### `<repo-name>` (test scope only), added only when a step writes tests there -->

| File | Change | Summary |
| --- | --- | --- |
| `path/to/file` | New / Modify / Delete | One-line description |

**Indirect impact:** callers, consumers, or downstream services affected by the above.

## Domains/UCs Touched

One line per product repo — `execute`'s gate reads this section:

- `` `<repo>`: `<repo>:UC-<id>`, `<repo>:domain-<name>` `` — or `` `<repo>`: None — <reason> ``

## Codebase Gaps

What is currently absent and must be added as part of this ticket (validations, tests, logging/error handling, relevant tech debt).

## Verification Policy

For impact-enabled Implement runs only: add `**Repository impact contract:** 1` after the plan header and a preceding `## Repository Impact` section with a brief summary and the exact supplied JSON definition. The policy below covers change/verify product repos; Affected Code still lists actual edits only. See implement/references/repository-impact.md. Standalone/legacy plans omit this optional section/marker.


Copy the resolved testing-readiness choices supplied by `implement`, one row per affected product repo. `Mode` is `automated` or `manual`; `Decision` is `configured`, `user`, `project-policy`, or `autonomy-default`. Manual mode permits only `user` or `project-policy`, with the decision reference in Reason. Proposed/pending tooling cannot be marked automated. When no policy was resolved (standalone or legacy planning), write `None` instead of inventing authorization; existing gate behavior then applies.

| Repo | Mode | Decision | Reason |
| --- | --- | --- | --- |
| <repo-name> | <mode> | <decision source> | <readiness decision or policy reference> |

## Risks

| Risk | Severity | Mitigation | Residual severity |
| --- | --- | --- | --- |
| … | High / Med / Low | … | High / Med / Low |

**Overall risk (before mitigations):** High / Med / Low — the highest value in the Severity column above.
**Overall risk (after mitigations):** High / Med / Low — the highest value in the Residual severity column above, escalated to High if three or more rows carry a Medium residual severity.

Include cross-repo deployment order and rollback approach here.

If Overall risk (after mitigations) is High, add:

### Phasing alternative

A smaller, independently-shippable first phase that lowers residual risk (e.g. a read-only phase before a write phase, a feature-flagged rollout, a reduced pilot scope) — an alternative the user can choose instead of executing the full plan at once.

## Pre-flight

The working-tree check applies before planning starts. Setup files supplied by `implement`'s testing readiness are an accepted baseline: name them here and in Affected Code. Test preparation after plan approval leaves intentional uncommitted test changes; planning itself writes neither tests nor stubs. Neither requires discarding work to obtain a clean tree.

Stop and flag if any fail before writing code.

- [ ] On the correct branch, branched from `<base>`
- [ ] Build passes on the unmodified branch (clean baseline)
- [ ] Working tree clean or accepted setup baseline listed (`git status`); no unresolved conflicts
- [ ] _(project-specific prereqs)_

## Steps

### Step 1 — <title>

- **Files:** `path/to/file`
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** concrete instructions — exact file path, function name, field names. Short snippet only if the shape is non-obvious.

**Verify:** type-check/build passes with no new errors; _(specific observable check)_.

**Tests:** planned coverage, one line per in-scope repo: `<repo>: <backticked repo-relative test paths> [<layer>], <supported command>, <working directory>, <progression/regression scenarios and expected outcomes>, <prerequisites>`. Reuse existing test identities/selectors where adequate. State `Exempt — <reason>` only for an actual exemption; manual scenarios remain in Test Plan. Declare intended test-map changes in Affected Code and Files. Do not claim tests were written or observed passing/red. write-the-tests records results separately.

### Step N — Verify manual scenarios

_Include for required manual-policy verification or runnable manual scenarios. For automated-policy repos, known unavailable supplemental checks go in Post-delivery Verification instead. Do not silently defer a manual-policy gate. This is the final numbered execution step._ Walk through the relevant Test Plan scenarios against the running behavior, including nearby regression paths, and record observed results. **Verify:** each named manual scenario was actually performed and matched its expected observation; required build/lint/type checks also pass. Missing access or an unperformed scenario stops verification. This step neither installs a runner nor claims an automated suite passed.

## Test Plan

Define every planned automated and manual scenario here, including its expected result, originating step, intended test path, supported command and prerequisites. This is the coverage specification consumed by write-the-tests, not an observed test report.

Use unique Scenario names. With an explicit verification policy, include the Repo column below. Manual repos use Type `Manual`, and File / command describes setup, actions, expected observations and the originating step. Without a policy, the older three-column `Scenario | Type | File / command` format remains valid.

| Scenario | Repo | Type | File / command |
| --- | --- | --- | --- |
| Happy path | <repo-name> | Unit | … |
| _(edge case)_ | <repo-name> | Unit | … |
| _(failure scenario — DB error, downstream timeout)_ | <repo-name> | Unit | … |
| _(regression — existing flow that must keep working)_ | <repo-name> | Manual | <setup; actions; expected observation; step> |

**AC traceability:**

For Implement runs with `acceptance_evidence_version: 1`, use the three-column table below. Inventory every material clause of each AC from the accepted spec before mapping scenarios: conditions, included/excluded inputs, boundary values, outputs, ordering, error behavior, and parity with an existing path where required. Give each clause concrete text; split compound requirements even when one scenario covers several. Keep clauses with unavailable verification mapped to a concrete scenario so execution can mark them pending. Compare the inventory back to the spec; a broad scenario name is not proof that its assertions cover every clause. Older runs and standalone plans may retain the two-column `Acceptance criterion | Test scenario` table.

| Acceptance criterion | Requirement clause | Test scenario |
| --- | --- | --- |
| _(AC from spec)_ | _(one material behavior/condition from that AC)_ | _(row above)_ |

## Post-delivery Verification

None, or list each known unavailable supplemental scenario with its originating step, acceptance clauses, prerequisite, responsible actor and expected observation. Keep the scenario in Test Plan and AC traceability. Its evidence remains unverified until actually performed; listing it here does not establish a pass. Required manual-policy gates need an explicit policy decision before deferral.

## Definition of Done

- [ ] All ACs mapped to implementation + tests
- [ ] Test suite passes (no skipped/pending), or suites reported not run with reason
- [ ] Type-check / build / lint pass
- [ ] All **Verify** checkpoints green
- [ ] For every automated repo, every step's **Tests:** field is resolved — preparation evidence recorded by write-the-tests, and confirmed green or explicitly unavailable after execution. Manual/legacy no-framework repos have concrete Test Plan scenarios and the final manual verification step instead. Every manually selected repo has observed evidence for its scenarios; automated regression limitations remain explicit.
- [ ] Open questions resolved or escalated (owner named)
- [ ] Logging and error handling at the correct layers
- [ ] Security and authorization reviewed
- [ ] Backward compatibility confirmed (no silent breaking changes)
- [ ] DB migration documented (if schema changes)
- [ ] Rollback approach documented
- [ ] Cross-repo deployment order noted (if services deploy in sequence)
