#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

for case_name in implement-feedback-clean implement-feedback-nonminimal implement-feedback-idempotent; do
  echo "=== Running $case_name ==="
  claude plugin eval . --case "$case_name" --scaffold \
    --allow-tools Read Glob Grep Edit Write Bash Agent AskUserQuestion \
    --ablation none --runs 1 --trust-plugin --no-publish
done
