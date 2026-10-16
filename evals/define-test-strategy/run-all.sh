#!/usr/bin/env bash
# Runs all four define-test-strategy eval cases.
#
# dts-migrate-autopilot, fresh-autopilot and dts-multi-repo write the
# test-strategy skill under `.claude/skills/test-strategy/`, tag existing
# tests and edit CLAUDE.md, so they run on the disposable headless path with
# automatic grading (they are listed under `headless` in evals/suites.json).
#
# define-test-strategy-negative-control writes nothing (it must stop at the
# first question), so it runs through plain `claude plugin eval`.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/2: dts-migrate-autopilot, fresh-autopilot, dts-multi-repo (headless, auto-graded) ==="
node evals/run-suite.mjs full \
  --case=dts-migrate-autopilot --case=fresh-autopilot --case=dts-multi-repo

echo
echo "=== 2/2: define-test-strategy-negative-control (claude plugin eval) ==="
claude plugin eval . --case define-test-strategy-negative-control \
  --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== Done. ==="
