#!/usr/bin/env bash
set -euo pipefail
PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
source "$PLUGIN_ROOT/evals/assert-disposable-cwd.sh"
node "$PLUGIN_ROOT/evals/plan-the-work/fact-handoff-fixture.mjs" boundary-conflict
