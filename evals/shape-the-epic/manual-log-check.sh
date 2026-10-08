#!/usr/bin/env bash
# Manually verifies make-it-work/shape-the-epic-autopilot-log.jsonl, the one file
# this skill's autopilot run writes under `.claude/` — a path `claude plugin
# eval`'s sandbox blocks even with explicit tool grants (see
# evals/shape-the-epic/README.md and evals/go-deep/README.md for the
# underlying finding), so it can't be checked through plain
# `claude plugin eval`.
#
# Usage: bash evals/shape-the-epic/manual-log-check.sh [rich|sparse]
#   rich   (default) — reuses shape-the-epic-rich-input-autopilot's prompt.
#   sparse           — reuses shape-the-epic-sparse-input-autopilot's prompt,
#                       the one more likely to actually exercise the 6-turn
#                       cap (see that case's own graders).
#
# Unlike go-deep's equivalent script, this does NOT need
# --dangerously-skip-permissions: a direct probe during this suite's
# implementation showed that plain headless mode (`claude -p ... --allowedTools
# Write`, no --dangerously-skip-permissions) CAN write under `.claude/` in this
# environment — only `claude plugin eval`'s own sandbox blocks it. This matches
# evals/slice-the-epic/README.md's identical finding for that skill. This is a
# discrepancy with evals/go-deep/README.md's claim that "no permission grant or
# tool allowlist unblocks writing there, in claude plugin eval or in plain
# headless mode" — if this ever stops holding in some other environment, fall
# back to the go-deep-style manual path instead: add
# --dangerously-skip-permissions below (run by a human — an agent operating
# under this harness's own auto-mode safety net can't invoke or grant that
# flag to itself).
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
echo "    the schema in skills/shape-the-epic/SKILL.md's Autopilot Mode section"
echo "    (one JSON object per line: phase, site, kind, chosen, rationale, ...;"
echo "    for the sparse case, look for a 'part-a-cap-reached' site if the cap"
echo "    was hit, and confirm no entry's Part 2A turn count exceeds 6)."
echo "  - \$(ls $RUN_DIR/make-it-work/epic-*.md) against"
echo "    evals/shape-the-epic/shape-the-epic-${CASE}-input-autopilot/graders/*.md."
