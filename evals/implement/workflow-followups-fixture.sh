#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/implement-autopilot-full/fixture.sh"
PLUGIN_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cp "$PLUGIN_ROOT/skills/implement/references/orchestration/planning.md" coordinator-guide.md
cp "$PLUGIN_ROOT/skills/write-the-tests/references/implement-integration.md" worker-guide.md
case "$1" in
  branch-ticket-mismatch)
    git switch -c feature/OLD-42-fix
    printf '\n// User edit for OLD-42\n' >> src/policy.js
    printf 'Private local notes\n' > user-notes.txt
    ;;
  residual-risk-presentation)
    cat > plan.md <<'PLAN'
# Plan for APP-12

## Risks

| Risk | Severity | Mitigation | Residual severity |
| --- | --- | --- | --- |
| Approval-time date recalculation may change the submitted date after approval | Medium | Stop if recalculation changes the approved date; boundary verification is pending. This limits propagation but does not reduce the rating. | Medium |

**Overall risk (after mitigations):** Medium
PLAN
    ;;
  residual-risk-low)
    cat > plan.md <<'PLAN'
# Plan for APP-12

## Risks

| Risk | Severity | Mitigation | Residual severity |
| --- | --- | --- | --- |
| A label could be displayed incorrectly | Low | Existing label assertions cover the unchanged renderer | Low |

**Overall risk (after mitigations):** Low
PLAN
    ;;
  delegate-test-compromise)
    cat > spec.md <<'SPEC'
# Accepted spec — APP-12
AC1: A date after the last configured period returns no period, including when the configured list is nonempty.
SPEC
    cat > plan.md <<'PLAN'
# Approved plan — APP-12
Implement findPeriod in src/period.js; write test/period.test.js first. Cover AC1 beyond the final configured period; preserve valid in-period lookup. No product decisions remain open.
PLAN
    cat > src/period.js <<'JS'
exports.findPeriod = (periods, date) => periods.find(period => date >= period.start);
JS
    cat > test/period.test.js <<'JS'
const assert = require('node:assert/strict');
const test = require('node:test');
const { findPeriod } = require('../src/period');
test('beyond the last configured period', () => assert.equal(findPeriod([], 20), undefined));
JS
    cat > worker-report.md <<'REPORT'
# Test-worker hand-back
The test passes. Modelling compromise: I represented beyond the final configured period with an empty list because the lookup currently checks only a lower bound. I did not test a date after the end of a nonempty configured list. Planned paths only were edited. I have not changed production code.
REPORT
    ;;
  *) echo 'Unknown follow-up fixture' >&2; exit 1 ;;
esac
