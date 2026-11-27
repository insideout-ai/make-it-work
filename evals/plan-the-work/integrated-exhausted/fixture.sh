#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
mkdir -p make-it-work/REV-1 tests src
cat > make-it-work/REV-1/REV-1-spec.md <<'EOF'
# REV-1
Exclude cancelled payments and return all remaining payments newest first.
Account profile behavior is unchanged.
EOF
cat > make-it-work/REV-1/REV-1-plan.md <<'EOF'
# REV-1 plan
## Implementation
Implement list_payments at the payments public interface: filter cancelled entries and sort newest first.
## Test Plan
Scenario P1: provide mixed cancelled/completed payments in unsorted date order. Assert returned count is two.
## Regression Impact
Account-profile behavior is excluded: no dependency or interface change reaches it. No additional suite is selected.
EOF
cat > tests/test_payments.py <<'EOF'
from unittest.mock import Mock

def test_payments():
    list_payments = Mock(return_value=[{'id': 'old'}, {'id': 'cancelled'}])
    assert len(list_payments()) == 2
EOF
cat > src/payments.py <<'EOF'
def list_payments(payments):
    raise NotImplementedError('pending implementation')
EOF
cat > make-it-work/REV-1/preparation.md <<'EOF'
Historical progression observation: expected-red because required behavior is missing. No current execution is recorded. This observation does not prove coverage of the assertions currently present.
EOF
cat > make-it-work/REV-1/REV-1-plan-quality-review.md <<'EOF'
# Attempt 1 — exhausted
Stage: plan. Method: author self-review; no agent tool.
Completed passes: 2. Disposition: BLOCKED.
Pass 1: P1 counts results but never asserts newest-first order.
Correction: assertion text clarified to returned count of two; order remains unchecked.
Pass 2: ordering remains unsupported. Responsible artifact: REV-1-plan.md, Test Plan P1.
No new attempt authorized. Preserve the spec and exclusion of account-profile suites.
EOF
