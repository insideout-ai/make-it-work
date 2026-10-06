# Plan v2 — policy decision

**Replan reason:** The first design treated the policy as a single happy-path check and a narrow patch did not cover the complete decision table.

**Design reset:** Model the behavior as a complete role decision table. Map every role named by the approved spec to an explicit implementation outcome and test before execution.

## What This Changes

Keep the policy helper aligned with every approved role outcome.

## Execution Status

**Mode:** Inline — execute steps in this session, checkpointed after each step's Verify.

**Progress:** Step 1 of 1 complete.

## Steps

### Step 1 — Implement and verify the complete decision table

The implementation and its complement verification are complete.
