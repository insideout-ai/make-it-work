#!/usr/bin/env bash
# Runs all four close-the-gaps autopilot smoke-test cases via `claude plugin eval`.
#
# All four run fully automatically. close-the-gaps's only `.claude/` write is
# its autopilot decision log (.claude/close-the-gaps-autopilot-log.jsonl),
# which Claude Code blocks under plain `claude plugin eval` the same way it
# blocks any `.claude/` write (see evals/go-deep/README.md for the underlying
# finding). Everything else this skill writes (make-it-work/<TICKET>-questions.md,
# make-it-work/<TICKET>-spec.md) is a normal, unblocked path, so the four cases
# below verify the skill's actual behavior in full. Only the decision log's own
# existence/schema needs the manual --dangerously-skip-permissions path — see
# evals/close-the-gaps/README.md for that command.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# `claude plugin eval` exits 1 if any case scores below --threshold (default
# 1.0). Run every case even if an earlier one comes back imperfect, and only
# report overall failure at the end, so one weak case doesn't hide the rest.
overall_rc=0
for case_name in \
  close-the-gaps-live-autopilot \
  close-the-gaps-stale-questions-file \
  close-the-gaps-offline-injection \
  close-the-gaps-negative-control
do
  echo "=== $case_name (claude plugin eval) ==="
  claude plugin eval . --case "$case_name" --scaffold --allow-tools Write Edit \
    --ablation none --runs 1 --trust-plugin --no-publish
  rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "WARNING: $case_name exited $rc (see its report above)"
    overall_rc=1
  fi
  echo
done

echo "=== Done. See evals/close-the-gaps/README.md for the one manual check ==="
echo "    (.claude/close-the-gaps-autopilot-log.jsonl itself — run:"
echo "    bash evals/close-the-gaps/manual-log-check.sh )"
exit "$overall_rc"
