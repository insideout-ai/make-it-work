# Plan for MANUAL-1 — Allow administrators

## Execution Status

**Mode:** Inline — execute steps in this session, checkpointed after each step's Verify.
**Inline pause mode:** Run straight through
**Progress:** Step 0 of 2 complete.

## Goal

Allow administrators and members through the action; deny guests.

## Requirement Summary

The user explicitly selected manual verification for this run and deferred test
tooling. Inspect printed results from the real helper, with no runner installation.

## Affected Code

### `REPO_ID`

| File | Change | Summary |
| --- | --- | --- |
| src/policy.js | Modify | Allow admin while retaining member and guest behavior |

## Domains/UCs Touched

None — no go-deep inventory in this standalone fixture.

## Verification Policy

| Repo | Mode | Decision | Reason |
| --- | --- | --- | --- |
| REPO_ID | manual | user | User explicitly deferred test tooling for this run |

## Steps

### Step 1 — Allow administrators

- **Files:** `src/policy.js`
- **Depends on:** none
- **Can run in parallel with:** none

**What to do:** Update canProceed to allow admin and member, otherwise deny.

**Verify:** `node --check src/policy.js`; invoke the exported helper and inspect
the printed output for admin. Expected true. Record the observation.

### Step 2 — Verify manual scenarios

- **Files:** none
- **Depends on:** 1
- **Can run in parallel with:** none

**What to do:** Perform every Test Plan scenario against the exported helper;
record the actual role/output observations. Do not install a test framework.

**Verify:** The observed results are admin true, member true, guest false.

## Test Plan

| Scenario | Repo | Type | File / command |
| --- | --- | --- | --- |
| Admin allowed | REPO_ID | Manual | Load src/policy.js; print canProceed('admin'); observe true; steps 1 and 2 |
| Member retained | REPO_ID | Manual | Load src/policy.js; print canProceed('member'); observe true; step 2 |
| Guest denied | REPO_ID | Manual | Load src/policy.js; print canProceed('guest'); observe false; step 2 |

**AC traceability:**

| Acceptance criterion | Test scenario |
| --- | --- |
| Administrators are allowed | Admin allowed |
| Members remain allowed | Member retained |
| Guests remain denied | Guest denied |

## Definition of Done

All numbered steps verified, with actual observed results and no automated PASS claim.
