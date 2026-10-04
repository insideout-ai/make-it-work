#!/usr/bin/env bash
# Runs all four plan-the-work autopilot smoke-test cases.
#
# negative-control, happy-path, and plan-collision run fully automatically via
# `claude plugin eval` — plan-the-work writes nothing but make-it-work/*.md
# files, so no `.claude/` exposure blocks them. The one exception in each
# autopilot case is the decision log itself (`.claude/plan-the-work-autopilot-log.jsonl`),
# which is always under the protected `.claude/` path — see README.md for how
# to check it by hand.
#
# with-tests needs real Bash (running the fixture's test suite) and
# therefore hits a separate, unrelated, known blocker on this machine: granting
# Bash to a `claude plugin eval` case fails here because of a symlink inside
# this machine's Docker credential store (`~/.docker`) — see the spec's §1.5 and
# README.md. It is run manually via `--dangerously-skip-permissions`, scoped to
# a disposable mktemp dir, the same pattern `evals/go-deep/run-all.sh` uses.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/5: negative-control (claude plugin eval) ==="
claude plugin eval . --case plan-the-work-negative-control --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== 2/5: plan-collision-negative-control (claude plugin eval) ==="
claude plugin eval . --case plan-the-work-plan-collision-negative-control --scaffold \
  --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== 3/5: happy-path (claude plugin eval) ==="
claude plugin eval . --case plan-the-work-happy-path --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== 4/5: plan-collision (claude plugin eval) ==="
claude plugin eval . --case plan-the-work-plan-collision --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== 5/5: with-tests (manual headless run, --dangerously-skip-permissions) ==="
RUN_DIR=$(mktemp -d)
echo "Run dir: $RUN_DIR"
(cd "$RUN_DIR" && bash "$REPO_ROOT/evals/plan-the-work/with-tests/fixture.sh")

PRE_STATUS=$(git -C "$REPO_ROOT" status --porcelain --ignored)

TRANSCRIPT="/tmp/plan-the-work-with-tests-transcript.jsonl"
(cd "$RUN_DIR" && claude -p "/make-it-work:plan-the-work DEMO-400 --autopilot" \
  --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
  --output-format stream-json --verbose > "$TRANSCRIPT" 2>&1)

POST_STATUS=$(git -C "$REPO_ROOT" status --porcelain --ignored)
if [ "$PRE_STATUS" != "$POST_STATUS" ]; then
  echo "WARNING: $REPO_ROOT's git status changed during this run — investigate before trusting the result."
  diff <(echo "$PRE_STATUS") <(echo "$POST_STATUS") || true
else
  echo "Real repo untouched: OK"
fi

echo "$RUN_DIR" > /tmp/plan-the-work-with-tests-rundir.txt
echo "with-tests run dir:   $RUN_DIR"
echo "with-tests transcript: $TRANSCRIPT"
echo "Check its files, git status (test file uncommitted, no red-state commit), and"
echo ".claude/plan-the-work-autopilot-log.jsonl against evals/plan-the-work/with-tests/graders/*.md"

echo
echo "=== Done. ==="
