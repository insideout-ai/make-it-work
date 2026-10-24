#!/usr/bin/env bash
# Runs all define-test-strategy eval cases.
#
# The suite runner selects disposable headless or interactive plugin-eval mode
# per case. Headless runs may exercise the blocked-write path under `.claude/`;
# see README.md for the manual full-write checks.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

node evals/run-suite.mjs full \
  --case=dts-fresh-tests --case=fresh-autopilot --case=dts-multi-repo \
  --case=define-test-strategy-negative-control --case=dts-no-tooling \
  --case=dts-strategy-api-autopilot --case=dts-strategy-interactive \
  --case=dts-coverage-only --case=dts-strategy-mixed-autopilot \
  --case=dts-strategy-mixed-interactive --case=dts-selected-layers "$@"
