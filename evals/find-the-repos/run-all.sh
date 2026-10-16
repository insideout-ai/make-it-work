#!/usr/bin/env bash
# Runs interactive checkpoints and unattended evidence/save cases. Requires
# signed-in Claude Code and approval for external model usage. No permission
# bypass flags are used. The evidence case uses the disposable headless runner.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

for case_name in \
  find-the-repos-happy-path \
  find-the-repos-technical-fallback \
  find-the-repos-single-repo-refusal \
  find-the-repos-unrelated-clones \
  find-the-repos-autopilot-save-injection
do
  claude plugin eval . --case "$case_name" --scaffold \
    --allow-tools Read Glob Grep Write Edit AskUserQuestion \
    --ablation none --runs 1 --trust-plugin --no-publish --judge-model sonnet
done

node evals/run-suite.mjs full \
  --case=find-the-repos-evidence-drilldown \
  --case=find-the-repos-catalog-workspace \
  --case=find-the-repos-combined-intake \
  --case=find-the-repos-confirm-pending --max-cost-usd=6
