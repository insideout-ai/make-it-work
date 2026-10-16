#!/usr/bin/env bash
# Generates a disposable autopilot run for inspecting the epic and audit log.
# Previous plugin-eval runs denied log writes; this helper uses plain headless
# Claude with explicit tool grants. See README.md for current expectations.
#
# Usage: bash evals/shape-the-epic/manual-log-check.sh [rich|sparse]
#   rich   (default) — reuses shape-the-epic-rich-input-autopilot's prompt.
#   sparse           — reuses shape-the-epic-sparse-input-autopilot's prompt.
#
# Requires signed-in Claude Code. A denied log write remains non-fatal; do not
# broaden permissions or retry through another tool merely to create the log.
#
# Scope is a disposable mktemp dir only; this script diffs this repo's git
# status before/after to confirm nothing leaked into it, and refuses to run
# at all if its own cwd is somehow this plugin's real checkout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Guard against ever running this script with cwd left at this plugin's own
# real checkout — cheap insurance against the exact failure mode that once
# corrupted this repo's branch/commit history during this rollout's earlier
# work (a fixture script run with cwd at the repo root instead of a disposable
# scratch dir). This script runs no git commands itself, but the guard is kept
# anyway, as the same self-check every fixture.sh in this rollout carries.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  CWD_TOPLEVEL="$(cd "$(git rev-parse --show-toplevel)" && pwd -P)"
  PLUGIN_ROOT_REAL="$(cd "$REPO_ROOT" && pwd -P)"
  if [ "$CWD_TOPLEVEL" = "$PLUGIN_ROOT_REAL" ]; then
    echo "manual-log-check.sh: refusing to run from this plugin's own real checkout: $(pwd)" >&2
    echo "manual-log-check.sh: this script cd's into its own mktemp dir before running claude, so running it from here is never required — but refusing anyway as defense in depth." >&2
    exit 1
  fi
fi

CASE="${1:-rich}"
case "$CASE" in
  rich)
    PROMPT_SOURCE="$REPO_ROOT/evals/shape-the-epic/shape-the-epic-rich-input-autopilot/prompt.md"
    ;;
  sparse)
    PROMPT_SOURCE="$REPO_ROOT/evals/shape-the-epic/shape-the-epic-sparse-input-autopilot/prompt.md"
    ;;
  *)
    echo "Usage: $0 [rich|sparse]" >&2
    exit 1
    ;;
esac

RUN_DIR=$(mktemp -d)
echo "Run dir: $RUN_DIR"

# Strip the prompt.md frontmatter (the first two '---' lines) to get the
# literal prompt body, same text `claude plugin eval` would send.
PROMPT_BODY=$(awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$PROMPT_SOURCE")

PRE_STATUS=$(git -C "$REPO_ROOT" status --porcelain --ignored)

TRANSCRIPT="/tmp/shape-the-epic-${CASE}-log-transcript.jsonl"
(cd "$RUN_DIR" && claude -p "$PROMPT_BODY" \
  --plugin-dir "$REPO_ROOT" --allowedTools Write Edit Read AskUserQuestion \
  --output-format stream-json --verbose > "$TRANSCRIPT" 2>&1)

POST_STATUS=$(git -C "$REPO_ROOT" status --porcelain --ignored)
if [ "$PRE_STATUS" != "$POST_STATUS" ]; then
  echo "WARNING: $REPO_ROOT's git status changed during this run — investigate before trusting the result."
  diff <(echo "$PRE_STATUS") <(echo "$POST_STATUS") || true
else
  echo "Real repo untouched: OK"
fi

echo "$RUN_DIR" > "/tmp/shape-the-epic-${CASE}-rundir.txt"
echo "Run dir:    $RUN_DIR"
echo "Transcript: $TRANSCRIPT"
echo
echo "Now check by hand:"
echo "  - $RUN_DIR/make-it-work/shape-the-epic-autopilot-log.jsonl exists and matches"
echo "    the schema linked from skills/shape-the-epic/references/autopilot.md"
echo "    (one JSON object per line: phase, site, kind, chosen, rationale, ...;"
echo "    an empty file is valid when no automatic resolution was needed)."
echo "  - Mode/focus selection and discovery entries match the actual resolutions."
echo "  - The Part A summary reports 0–6 open-text turns and the actual exit."
echo "  - No category-draft approval entries or post-interview approval loop."
echo "  - \$(ls $RUN_DIR/make-it-work/epic-*.md) against"
echo "    evals/shape-the-epic/shape-the-epic-${CASE}-input-autopilot/graders/*.md."
