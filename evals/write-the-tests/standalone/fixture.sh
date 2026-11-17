#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p test-preparation/src test-preparation/tests test-preparation/make-it-work/TEST-1
cd test-preparation
git init -q -b TEST-1
cat > src/discount.py <<'PY'
def discount(amount):
    return amount * 0.9
PY
cat > CLAUDE.md <<'MD'
# Discount utility
Use Python's standard unittest runner. Production is src/discount.py; tests belong in tests/test_discount.py. The src directory is importable as a namespace package from the repository root. No test strategy or generated test map is required.
MD
cat > make-it-work/TEST-1/TEST-1-spec.md <<'MD'
# Discount validation
Positive amounts receive a ten percent discount. Negative amounts must raise ValueError. Zero remains zero. Change no other behavior.
MD
cat > make-it-work/TEST-1/TEST-1-plan.md <<'MD'
# Plan for TEST-1

**Test preparation contract:** 1

> Spec: make-it-work/TEST-1/TEST-1-spec.md

## Execution Status

**Mode:** Not yet chosen

**Progress:** Step 0 of 1 complete

## Affected Code

### `test-preparation`

| File | Change | Summary |
| --- | --- | --- |
| `src/discount.py` | Modify | Reject negative amounts |
| `tests/test_discount.py` | New | Cover valid and negative amounts |

## Verification Policy

None

## Steps

### Step 1 — Reject negative amounts

**Files:** `src/discount.py`, `tests/test_discount.py`

**Depends on:** none

**Can run in parallel with:** none

**What to do:** Raise ValueError for amounts below zero; preserve zero and positive calculations.

**Verify:** All planned unittest cases pass after implementation.

**Tests:** test-preparation: `tests/test_discount.py` [Unit], python3 -m unittest discover -s tests -p test_discount.py; progression rejects -1, regression returns 9 for 10 and 0 for 0. Select named cases through the supported unittest discover/loader interface.

## Test Plan

| Scenario | Repo | Type | File / command |
| --- | --- | --- | --- |
| Reject negative amount | test-preparation | Unit | step 1; tests/test_discount.py; expect ValueError for -1 |
| Preserve valid amounts | test-preparation | Unit | step 1; tests/test_discount.py; expect 9 for 10 and 0 for 0 |
MD
git add .
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Approved plan and current discount behavior'
