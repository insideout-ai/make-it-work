#!/usr/bin/env bash
# Runs all three shape-the-epic autopilot smoke-test cases via `claude plugin eval`.
#
# All three run fully automatically. shape-the-epic's only `.claude/` write is
# its autopilot decision log (.claude/shape-the-epic-autopilot-log.jsonl),
# which Claude Code's `claude plugin eval` sandbox blocks regardless of tool
# grants (see evals/go-deep/README.md for the underlying finding). Everything
# else this skill writes — make-it-work/epic-[title]-[timestamp].md — is a
# normal, unblocked path, so the three cases below verify the skill's actual
# behavior in full. Only the decision log's own existence/schema needs a
# manual run outside the eval sandbox — see evals/shape-the-epic/README.md and
# evals/shape-the-epic/manual-log-check.sh for that command.
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

echo "=== Done. See evals/shape-the-epic/README.md for the one manual check ==="
echo "    (.claude/shape-the-epic-autopilot-log.jsonl itself — run:"
echo "    bash evals/shape-the-epic/manual-log-check.sh rich"
echo "    bash evals/shape-the-epic/manual-log-check.sh sparse )"
exit "$overall_rc"
