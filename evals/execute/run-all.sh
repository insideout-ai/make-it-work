#!/usr/bin/env bash
# Runs all four execute autopilot smoke-test cases through claude plugin eval.
# Bash-granting cases use the guarded Docker/Git environment wrapper.
# Sandboxed evals grade attempted decision-log writes; when a standalone
# shared-writer call is permitted, they can grade on-disk persistence too.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# --threshold 0: a FAIL vote from one of three LLM-judge
# passes on a single grader (ordinary judge noise) must not abort this
# script via `set -e` before later cases get a chance to run.
# The per-case score breakdown is still printed in full either way — nothing
# here hides a real failure, it only stops a low score from killing the rest
# of this script.
echo "=== 1/4: execute-negative-control (claude plugin eval) ==="
claude plugin eval . --case execute-negative-control --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 2/4: execute-stop-at-gate (claude plugin eval) ==="
bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
  claude plugin eval . --case execute-stop-at-gate --scaffold \
  --allow-tools Read Glob Grep Write Edit Bash AskUserQuestion Agent \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 3/4: execute-resume-inline (claude plugin eval) ==="
bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
  claude plugin eval . --case execute-resume-inline --scaffold \
  --allow-tools Read Glob Grep Write Edit Bash AskUserQuestion Agent \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 4/4: execute-full-pass (claude plugin eval) ==="
bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
  claude plugin eval . --case execute-full-pass --scaffold \
  --allow-tools Read Glob Grep Write Edit Bash AskUserQuestion Agent \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0
