#!/usr/bin/env bash
# Manually verifies make-it-work/close-the-gaps-autopilot-log.jsonl, the one file
# this skill's autopilot run writes under `.claude/` — a path Claude Code
# protects even with explicit tool grants, so it can't be checked through
# plain `claude plugin eval` (see evals/close-the-gaps/README.md).
#
# Reuses close-the-gaps-live-autopilot's own fixture and prompt. Run this
# yourself (via `!` in a Claude Code session, or directly in a shell/CI) — not
# something to hand to an agent, since it needs --dangerously-skip-permissions,
# which an agent operating under this harness's own auto-mode safety net can't
# invoke or grant itself. Scope is a disposable mktemp dir only; this script
# diffs this repo's git status before/after to confirm nothing leaked into it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RUN_DIR=$(mktemp -d)
echo "Run dir: $RUN_DIR"
(cd "$RUN_DIR" && bash "$REPO_ROOT/evals/close-the-gaps/close-the-gaps-live-autopilot/fixture.sh")

PRE_STATUS=$(git -C "$REPO_ROOT" status --porcelain --ignored)

TRANSCRIPT="/tmp/close-the-gaps-live-autopilot-log-transcript.jsonl"
PROMPT=$(cat <<'EOF'
/make-it-work:close-the-gaps --autopilot

**Ticket:** TASK-77 — Add refund support for orders

**Description:**
When a customer requests a refund, the admin should mark the order as refunded. Refunded orders must no longer appear in the active orders list.

**Acceptance Criteria:**
- Orders can be refunded.
- Refunded orders are shown separately from active orders.
EOF
)

(cd "$RUN_DIR" && claude -p "$PROMPT" \
  --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
  --output-format stream-json --verbose > "$TRANSCRIPT" 2>&1)

POST_STATUS=$(git -C "$REPO_ROOT" status --porcelain --ignored)
if [ "$PRE_STATUS" != "$POST_STATUS" ]; then
  echo "WARNING: $REPO_ROOT's git status changed during this run — investigate before trusting the result."
  diff <(echo "$PRE_STATUS") <(echo "$POST_STATUS") || true
else
  echo "Real repo untouched: OK"
fi

echo "$RUN_DIR" > /tmp/close-the-gaps-live-autopilot-rundir.txt
echo "Run dir:    $RUN_DIR"
echo "Transcript: $TRANSCRIPT"
echo
echo "Now check by hand:"
echo "  - $RUN_DIR/make-it-work/close-the-gaps-autopilot-log.jsonl exists and matches"
echo "    the schema in skills/close-the-gaps/SKILL.md's Autopilot Mode section"
echo "    (one JSON object per line: phase, site, kind, chosen, rationale, ...)."
echo "  - $RUN_DIR/make-it-work/TASK-77-spec.md against"
echo "    evals/close-the-gaps/close-the-gaps-live-autopilot/graders/*.md."
