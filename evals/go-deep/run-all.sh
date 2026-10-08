#!/usr/bin/env bash
# Runs all three go-deep autopilot smoke-test cases.
#
# negative-control runs fully automatically via `claude plugin eval`.
# fresh-onboarding and repair-path need --dangerously-skip-permissions, since
# almost everything go-deep writes lives under `.claude/`, a path Claude Code
# protects even with explicit tool grants (see evals/go-deep/README.md). Scope
# is a disposable mktemp dir only, and a git-status diff on this repo confirms
# nothing leaked into it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/3: negative-control (claude plugin eval) ==="
claude plugin eval . --case negative-control --scaffold --allow-tools Write Edit \
  --ablation none --runs 1 --trust-plugin --no-publish

run_case() {
  local case_name="$1"
  echo
  echo "=== Running $case_name (manual headless run, --dangerously-skip-permissions) ==="

  local run_dir
  run_dir=$(mktemp -d)
  echo "Run dir: $run_dir"
  (cd "$run_dir" && bash "$REPO_ROOT/evals/go-deep/$case_name/fixture.sh")

  local pre_status post_status
  pre_status=$(git -C "$REPO_ROOT" status --porcelain --ignored)

  local transcript="/tmp/go-deep-${case_name}-transcript.jsonl"
  (cd "$run_dir" && claude -p "/make-it-work:go-deep --autopilot" \
    --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
    --output-format stream-json --verbose > "$transcript" 2>&1)

  post_status=$(git -C "$REPO_ROOT" status --porcelain --ignored)
  if [ "$pre_status" != "$post_status" ]; then
    echo "WARNING: $REPO_ROOT's git status changed during this run — investigate before trusting the result."
    diff <(echo "$pre_status") <(echo "$post_status") || true
  else
    echo "Real repo untouched: OK"
  fi

  echo "$run_dir" > "/tmp/go-deep-${case_name}-rundir.txt"
  echo "$case_name run dir:   $run_dir"
  echo "$case_name transcript: $transcript"
  echo "Check its files and make-it-work/go-deep-autopilot-log.jsonl against evals/go-deep/$case_name/graders/*.md"
}

run_case fresh-onboarding
run_case repair-path

echo
echo "=== Done. Run dir paths are saved to /tmp/go-deep-<case>-rundir.txt ==="
