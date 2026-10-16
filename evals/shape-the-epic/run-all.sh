#!/usr/bin/env bash
# Runs the three Product cases via plugin eval, then technical-debt and discovery
# cases through the shared disposable headless runner. Requires signed-in
# Claude Code. See README.md for sandbox limitations and artifact inspection.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# `claude plugin eval` exits 1 if any case scores below --threshold (default
# 1.0). Run every case even if an earlier one comes back imperfect, and only
# report overall failure at the end, so one weak case doesn't hide the rest.
overall_rc=0
for case_name in \
  shape-the-epic-rich-input-autopilot \
  shape-the-epic-sparse-input-autopilot \
  shape-the-epic-negative-control
do
  echo "=== $case_name (claude plugin eval) ==="
  claude plugin eval . --case "$case_name" --allow-tools Write Edit Read AskUserQuestion \
    --ablation none --runs 1 --trust-plugin --no-publish
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "WARNING: $case_name exited $rc (see its report above)"
    overall_rc=1
  fi
  echo
done

for case_name in \
  shape-the-epic-technical-debt-outcomes \
  shape-the-epic-technical-debt-sparse \
  shape-the-epic-discovery-interview
do
  node evals/run-suite.mjs full --case="$case_name" --max-cost-usd=3
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "WARNING: $case_name exited $rc (see its report above)"
    overall_rc=1
  fi
done

echo "=== Done. See evals/shape-the-epic/README.md for log inspection ==="
echo "    (make-it-work/shape-the-epic-autopilot-log.jsonl itself — run:"
echo "    bash evals/shape-the-epic/manual-log-check.sh rich"
echo "    bash evals/shape-the-epic/manual-log-check.sh sparse )"
exit "$overall_rc"
