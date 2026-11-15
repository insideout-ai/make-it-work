#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../implement-autopilot-full/fixture.sh"
mkdir -p make-it-work/DEMO-PROGRESS
cat > make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-spec.md <<'SPEC'
# Accepted spec — DEMO-PROGRESS

Allow administrators to proceed through the policy-protected action.

## Acceptance criteria
- The existing administrator identifier `admin` is allowed.
- Members remain allowed.
- Guests remain denied.

## Scope
Change the existing policy decision only. No new API, tooling or external service is needed.
SPEC
cp src/policy.js .eval-baseline-policy.js
cp test/policy.test.js .eval-baseline-regression.txt
cp make-it-work/DEMO-PROGRESS/DEMO-PROGRESS-spec.md .eval-baseline-spec.md
