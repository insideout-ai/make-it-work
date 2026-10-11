# Plan for DEMO-1 — add a formal greeting option

> **Spec:** `make-it-work/DEMO-1-spec.md` · **Target branch:** `main` · **For executors:** complete steps in order unless a step is marked **parallel**; do not proceed past a step until its **Verify** passes; do not edit files not listed in Affected Code.

## What This Changes

Today this tiny project can only greet someone casually ("Hello, Ann!"). After this plan, callers will also be able to request a formal greeting ("Good day, Ann.") via a second exported function. No existing behavior changes — this is a pure addition.

## Execution Status

_This section is owned by `execute`, not `plan-the-work` — `plan-the-work` writes it once, verbatim, as part of the initial skeleton, and never edits it again. Everything below is written for whichever session runs `execute` against this plan._

**Mode:** Inline — execute steps in this session, checkpointed after each step's Verify.

**Progress:** Step 1 of 2 complete. Update this line immediately after each step's Verify passes.

## Open Questions & Blockers

_None — all questions resolved before planning._

## Decision Log

_None — no planning questions were needed._

## Goal

Add a `greetFormally(name)` export to `src/greeting.js` that returns `"Good day, <name>."`. No change to the existing `greet(name)` export. See spec `make-it-work/DEMO-1-spec.md`.

## Requirement Summary

| | |
| --- | --- |
| **Business goal** | Let callers request a more formal tone for the greeting, for contexts (e.g. official notices) where "Hello" reads as too casual. |
| **In scope** | A new `greetFormally` export in `src/greeting.js`. |
| **Out of scope** | Changing `greet`'s existing behavior; localization; any UI. |
| **Assumptions** | The formal greeting always ends with a period, never an exclamation mark, to read as more formal than `greet`'s existing "!" — inferred from the spec's one example since the spec gives no second example. |

## Approach

Add a second, independent exported function rather than adding a `{formal: true}` option to the existing `greet`, since the existing `greet` call sites (none exist yet in this tiny project, but the pattern generalizes) stay untouched and the new behavior is additive and easy to tree-shake if unused.

## Affected Code

### `tiny-greeter`

| File | Change | Summary |
| --- | --- | --- |
| `src/greeting.js` | Modify | Add a new `greetFormally(name)` export alongside the existing `greet` export. |

**Indirect impact:** None — nothing else in this project currently imports from `src/greeting.js`.

## Codebase Gaps

This project has no configured test framework (no `package.json`, `Makefile`, or CI config) — see the trailing `Step 2 — Write tests` below and the `## Test Plan` table, which carry this repo's verification instead of a `**Tests:**` field on Step 1.

## Risks

| Risk | Severity | Mitigation | Residual severity |
| --- | --- | --- | --- |
| New function is exported but never wired up to a caller, so the addition is dead code for now | Low | None needed — the spec explicitly scopes this ticket to adding the export itself; wiring up a caller is a separate, future ticket | Low |

**Overall risk (before mitigations):** Low — the highest value in the Severity column above.
**Overall risk (after mitigations):** Low — the highest value in the Residual severity column above.

No cross-repo deployment — single, dependency-free file change. Rollback: revert the one commit touching `src/greeting.js`.

## Pre-flight

- [x] On the correct branch, branched from `main`
- [x] Build passes on the unmodified branch (clean baseline) — no build step configured; N/A
- [x] Working tree clean (`git status`), no unresolved conflicts
- [x] No project-specific prereqs

## Steps

### Step 1 — Add `greetFormally` to `src/greeting.js`

- **Files:** `src/greeting.js`
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** In `src/greeting.js`, add a new exported function `greetFormally(name)` that returns the template string `` `Good day, ${name}.` `` — i.e. exactly `"Good day, "` followed by the `name` argument followed by `"."`. Add it to the existing `module.exports` object alongside `greet`, without changing `greet`'s own implementation.

**Verify:** `src/greeting.js` exports both `greet` and `greetFormally`; `greetFormally`'s implementation is confirmed, by reading the file, to return the documented string for any `name` argument (see the shared `## Test Plan` table's row for this step — this repo has no test framework, so this is a Test Plan row, not a `**Tests:**` field; see `### Step 2 — Write tests` below for how that row gets confirmed).

_Already complete — see `## Execution Status → Progress` above. `src/greeting.js` already contains `greetFormally` in this fixture's starting state._

### Step 2 — Write tests

_This repo has no configured test framework (no `package.json`, `Makefile`, or CI config), so this is the trailing step the per-step test-writing sub-phase's applicability gate produces for an out-of-scope repo — the last step before Definition of Done. Its "tests" are the manual scenario walkthroughs in the `## Test Plan` table below, not an automated command._

- **Files:** none — this step makes no code changes
- **Depends on:** Step 1
- **Can run in parallel with:** none

**What to do:** No code changes. Walk through every row of the `## Test Plan` table below against the code `src/greeting.js` now contains after Step 1, and confirm each row's described behavior holds — by reading the implementation directly (this project has no test runner to execute, so "manually confirm" here means code inspection, not running anything).

**Verify:** Every row in `## Test Plan` below is confirmed true by direct inspection of `src/greeting.js`.

## Test Plan

| Scenario | Type | File / command |
| --- | --- | --- |
| Happy path — `greetFormally("Ann")` | Manual (code inspection) | `src/greeting.js` — confirm it returns exactly `"Good day, Ann."` |
| Regression — `greet("Ann")` is unchanged | Manual (code inspection) | `src/greeting.js` — confirm it still returns exactly `"Hello, Ann!"` |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| Calling `greetFormally(name)` returns a formal greeting ending in a period | Happy path row above |
| Existing `greet(name)` behavior is unchanged | Regression row above |

## Definition of Done

- [ ] All ACs mapped to implementation + tests
- [ ] This repo has no configured test framework — the `## Test Plan` rows above and `### Step 2 — Write tests` cover it instead of an automated suite
- [ ] No build/type-check/lint configured for this project — N/A
- [ ] All **Verify** checkpoints green
- [ ] Open questions resolved or escalated (owner named) — none were open
- [ ] Logging and error handling at the correct layers — N/A, pure string formatting
- [ ] Security and authorization reviewed — N/A
- [ ] Backward compatibility confirmed (no silent breaking changes) — `greet`'s behavior is unchanged
- [ ] DB migration documented (if schema changes) — N/A
- [ ] Rollback approach documented — see Risks above
- [ ] Cross-repo deployment order noted (if services deploy in sequence) — N/A, single repo
