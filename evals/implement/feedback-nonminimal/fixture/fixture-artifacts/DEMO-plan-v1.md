# Plan v1 — policy decision

## What This Changes

Allow the primary role to proceed.

## Execution Status

**Mode:** Inline — execute steps in this session, checkpointed after each step's Verify.

**Progress:** Step 2 of 2 complete.

## Design

Implement the allowed path. This plan failed to map the spec's denied-role requirement to a step or test.

## Steps

### Step 1 — Implement the allowed path

Cover the primary allowed role.

### Step 2 — Fix the missing denied path

**Amended for fix cycle 1.** Root cause: the initial plan modeled only the happy path even though the approved spec described both allowed and denied outcomes. Add the missing complement test.
