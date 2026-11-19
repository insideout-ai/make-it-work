#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../worktree-offer/fixture.sh"
eval_sessions_parent="$(mktemp -d "${TMPDIR:-/tmp}/miw-eval-worktree-preview.XXXXXX")"
printf '%s\n' "$eval_sessions_parent" > .eval-session-parent
