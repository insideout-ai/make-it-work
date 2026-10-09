#!/usr/bin/env bash
# Runs all five plan-the-work autopilot smoke-test cases.
#
# negative-control and plan-collision-negative-control need no Bash. Happy-path
# and plan-collision use Bash to invoke the plan-status updater; the shared
# environment wrapper handles this host's Docker/Git sandbox quirks. The one exception in each
# autopilot case is the decision log itself (`make-it-work/plan-the-work-autopilot-log.jsonl`),
# which is always under the protected `.claude/` path — see README.md for how
# to check it by hand.
#
# with-tests also needs real Bash for the fixture's test suite. All five cases
# now run through claude plugin eval; on-disk `.claude/` log persistence remains
# a separate permission-enabled manual check.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Print every case's score even if a noisy LLM grader fails; inspect the
# per-case report rather than treating this runner's exit status as a gate.

echo "=== 1/5: negative-control (claude plugin eval) ==="
claude plugin eval . --case plan-the-work-negative-control --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 2/5: plan-collision-negative-control (claude plugin eval) ==="
claude plugin eval . --case plan-the-work-plan-collision-negative-control --scaffold \
  --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 3/5: happy-path (claude plugin eval) ==="
bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
  claude plugin eval . --case plan-the-work-happy-path --scaffold \
  --allow-tools Read Glob Grep Write Edit Bash AskUserQuestion Agent \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 4/5: plan-collision (claude plugin eval) ==="
bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
  claude plugin eval . --case plan-the-work-plan-collision --scaffold \
  --allow-tools Read Glob Grep Write Edit Bash AskUserQuestion Agent \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 5/5: with-tests (claude plugin eval) ==="
bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
  claude plugin eval . --case plan-the-work-with-tests --scaffold \
  --allow-tools Read Glob Grep Write Edit Bash AskUserQuestion Agent \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== Done. ==="
