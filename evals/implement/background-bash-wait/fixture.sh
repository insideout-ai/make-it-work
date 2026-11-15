#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../implement-autopilot-full/fixture.sh"
# Keep the delegated baseline live long enough for the parent Stop hook to run.
# This delay belongs only to the disposable integration fixture, never the skill.
cat > test/async-baseline.test.js <<'TEST'
const assert = require('node:assert/strict');
const test = require('node:test');
const { setTimeout } = require('node:timers/promises');
const { canProceed } = require('../src/policy');
test('policy baseline remains stable across a deferred check', async () => {
  await setTimeout(10000);
  assert.equal(canProceed('member'), true);
  assert.equal(canProceed('guest'), false);
});
TEST
git add test/async-baseline.test.js
git -c user.name=fixture -c user.email=fixture@example.com commit -qm 'Add deferred baseline for the wait lifecycle check'
node --test
mkdir -p make-it-work/DEMO-WAIT
cat > make-it-work/DEMO-WAIT/DEMO-WAIT-spec.md <<'SPEC'
# Accepted spec — DEMO-WAIT

Verify the existing policy baseline while checking Plan-stage delegation. No product change is requested in this focused run.

## Acceptance criteria
- Members remain allowed.
- Guests remain denied.
- Pause in Plan after the requested background baseline check returns; do not execute or complete an implementation.
SPEC
