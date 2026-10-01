#!/usr/bin/env bash
# Runs all four find-the-repos smoke-test cases. find-the-repos has no autopilot mode and writes
# nothing but make-it-work/*-repos.md (only after a human confirms the draft shortlist, which a
# one-shot headless run never reaches) — so unlike plan-the-work/shape-the-epic/etc., none of these
# cases need Bash or --dangerously-skip-permissions; all four run fully through plain
# `claude plugin eval`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/4: happy-path ==="
claude plugin eval . --case find-the-repos-happy-path --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --judge-model sonnet

echo
echo "=== 2/4: technical-fallback ==="
claude plugin eval . --case find-the-repos-technical-fallback --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --judge-model sonnet

echo
echo "=== 3/4: single-repo-refusal ==="
claude plugin eval . --case find-the-repos-single-repo-refusal --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --judge-model sonnet

echo
echo "=== 4/4: unrelated-clones ==="
claude plugin eval . --case find-the-repos-unrelated-clones --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --judge-model sonnet

echo
echo "=== Done. ==="
