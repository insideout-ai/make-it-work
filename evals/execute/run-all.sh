#!/usr/bin/env bash
# Runs all four execute autopilot smoke-test cases.
#
# execute-negative-control, execute-stop-at-gate, and execute-resume-inline
# run fully automatically via `claude plugin eval` — none of them need Bash
# (see evals/execute/README.md for why). execute-full-pass needs Bash (both
# for a step's own test command and for run-regression's real full-suite
# run), and granting Bash to a `claude plugin eval` case hits this machine's
# known, unresolved blocker (see autopilot-eval-rollout-spec.md §1.5: a
# symlink inside the local Docker credential store). So execute-full-pass
# runs manually via --dangerously-skip-permissions, scoped to a disposable
# mktemp dir only, with a git-status diff on this repo confirming nothing
# leaked into it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# --threshold 0 on these three: a FAIL vote from one of three LLM-judge
# passes on a single grader (ordinary judge noise) must not abort this
# script via `set -e` before execute-full-pass ever gets a chance to run.
# The per-case score breakdown is still printed in full either way — nothing
# here hides a real failure, it only stops a low score from killing the rest
# of this script.
echo "=== 1/4: execute-negative-control (claude plugin eval) ==="
claude plugin eval . --case execute-negative-control --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 2/4: execute-stop-at-gate (claude plugin eval) ==="
claude plugin eval . --case execute-stop-at-gate --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 3/4: execute-resume-inline (claude plugin eval) ==="
claude plugin eval . --case execute-resume-inline --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish --threshold 0

echo
echo "=== 4/4: execute-full-pass (manual headless run, --dangerously-skip-permissions) ==="

RUN_DIR=$(mktemp -d)
echo "Run dir: $RUN_DIR"
(cd "$RUN_DIR" && bash "$REPO_ROOT/evals/execute/execute-full-pass/fixture.sh")

pre_status=$(git -C "$REPO_ROOT" status --porcelain --ignored)

transcript="/tmp/execute-full-pass-transcript.jsonl"
(cd "$RUN_DIR" && claude -p "/make-it-work:execute make-it-work/DEMO-2-plan.md --autopilot" \
  --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
  --output-format stream-json --verbose > "$transcript" 2>&1)

post_status=$(git -C "$REPO_ROOT" status --porcelain --ignored)
if [ "$pre_status" != "$post_status" ]; then
  echo "WARNING: $REPO_ROOT's git status changed during this run — investigate before trusting the result."
  diff <(echo "$pre_status") <(echo "$post_status") || true
else
  echo "Real repo untouched: OK"
fi

echo "$RUN_DIR" > /tmp/execute-full-pass-rundir.txt
echo "execute-full-pass run dir:   $RUN_DIR"
echo "execute-full-pass transcript: $transcript"
echo "Check its files, its plan's ## Execution Status section, and $RUN_DIR/.claude/execute-autopilot-log.jsonl against evals/execute/execute-full-pass/graders/*.md"
