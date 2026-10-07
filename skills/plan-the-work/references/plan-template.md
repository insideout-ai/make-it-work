# Plan Template

Template for `plan-the-work`'s `### Plan structure` step. Reproduce this exact structure when writing a plan file — keep every section, writing "None" where empty rather than deleting it.

# Plan for <TICKET> — <feature-title>

> **Spec:** `<resolved spec path>` · **Target branch:** `<branch>` · **For executors:** complete steps in order unless a step is marked **parallel**; do not proceed past a step until its **Verify** passes; do not edit files not listed in Affected Code.

## What This Changes

3–6 sentences, plain business/technical language a non-implementer can follow: what will be different after this plan is executed, and why it matters. No file paths, function/class/method names, or code snippets — those live in Affected Code and Steps.

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

### `<repo-name>`  <!-- one section per affected repo; a single-repo plan has just one -->

| File | Change | Summary |
| --- | --- | --- |
| `path/to/file` | New / Modify / Delete | One-line description |

**Indirect impact:** callers, consumers, or downstream services affected by the above.

## Codebase Gaps

What is currently absent and must be added as part of this ticket (validations, tests, logging/error handling, relevant tech debt).

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

The "Working tree clean" check below applies once, before planning starts — the uncommitted test files (and any New-row stub signatures) the test-writing sub-phase produces as planning proceeds (see the `### Writing and confirming each step's tests` subsection above) are an expected, intentional deviation from a clean tree, not a Pre-flight violation.

Stop and flag if any fail before writing code.

- [ ] On the correct branch, branched from `<base>`
- [ ] Build passes on the unmodified branch (clean baseline)
- [ ] Working tree clean (`git status`), no unresolved conflicts
- [ ] _(project-specific prereqs)_

## Steps

### Step 1 — <title>

- **Files:** `path/to/file`
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** concrete instructions — exact file path, function name, field names. Short snippet only if the shape is non-obvious.

**Verify:** type-check/build passes with no new errors; _(specific observable check)_.

**Tests:** for a single-repo step (or a step whose Affected Code table lists one in-scope repo): `<file path(s)>, <exact command>, <confirmed state: "progression red — <reason>" / "regression passing">` — or, for an exempt step, `Exempt — <one-line reason>`. For a step whose Affected Code table lists more than one repo, one line per repo, since point 9 above requires each in-scope repo to get its own entry: `<repo-name>: <file path(s)>, <exact command>, <confirmed state>` (repeated per repo, each on its own line) — an out-of-scope repo (no test framework, per point 1) is simply omitted from this field, since its scenarios already live in that repo's own `## Test Plan` rows instead.

### Step N — Write tests

_Only used for a repo where the per-step test-writing sub-phase's applicability gate (point 1 of the `### Writing and confirming each step's tests` subsection above) found no test framework configured — omit this step for a repo where a framework was found and tests were written per step instead. In a multi-repo plan with mixed framework availability across repos, this step still applies, scoped to whichever repo(s) lack a framework; in a single-repo plan with no framework, it covers the whole plan. When used, this is always the last step before Definition of Done._ Write the tests listed in the Test Plan for that repo. **Verify:** test suite passes; coverage on new files meets the project's bar.

## Test Plan

For a repo where the per-step test-writing sub-phase applies (a test framework is configured there), this section is a derived summary aggregating what each step's `**Tests:**` field already recorded for that repo — not a place to author new tests for it — and each such scenario row should reference which step its test came from. For a repo where no framework is configured, this section is instead the one place new test scenarios for that repo are authored directly, exactly as `plan-the-work` did before this sub-phase existed. A multi-repo plan may contain both kinds of row side by side.

| Scenario | Type | File / command |
| --- | --- | --- |
| Happy path | Unit | … |
| _(edge case)_ | Unit | … |
| _(failure scenario — DB error, downstream timeout)_ | Unit | … |
| _(regression — existing flow that must keep working)_ | Integration | … |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| _(AC from spec)_ | _(row above)_ |

## Definition of Done

- [ ] All ACs mapped to implementation + tests
- [ ] Test suite passes (no skipped/pending)
- [ ] Type-check / build / lint pass
- [ ] All **Verify** checkpoints green
- [ ] For every repo where the per-step test-writing sub-phase applies, every step's **Tests:** field is resolved — a test-required step's progression test is confirmed red and its regression test confirmed passing (or, once execution completes, confirmed green); no step's field is still an unaddressed placeholder. For any repo where no framework is configured, its `## Test Plan` rows and conditional `### Step N — Write tests` step cover it instead.
- [ ] Open questions resolved or escalated (owner named)
- [ ] Logging and error handling at the correct layers
- [ ] Security and authorization reviewed
- [ ] Backward compatibility confirmed (no silent breaking changes)
- [ ] DB migration documented (if schema changes)
- [ ] Rollback approach documented
- [ ] Cross-repo deployment order noted (if services deploy in sequence)
