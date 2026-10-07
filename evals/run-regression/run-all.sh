#!/usr/bin/env bash
# Runs all six run-regression autopilot smoke-test cases.
#
# rr-negative-control, rr-no-command-stop and rr-scoped-unavailable run
# fully automatically via `claude plugin eval` (no Bash grant needed — see
# README.md for why each of those three never needs to run a test command
# at all).
#
# rr-full-pass, rr-full-fail and rr-scoped-explicit need a Bash grant to
# actually run the fixture's test suite. The shared environment wrapper
# temporarily isolates this machine's symlink-containing Docker store and
# bypasses the macOS Git shim for those evals. If an eval still fails, this
# script falls back to a manual headless run with
# --dangerously-skip-permissions, scoped to a disposable mktemp dir, with
# a git-status diff (scoped to skills/run-regression/ and
# evals/run-regression/ only, per this work's concurrency constraints) to
# confirm nothing leaked into the real repo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

run_plain_eval() {
  local case_name="$1"
  shift
  claude plugin eval . --case "$case_name" --eval-dir evals/run-regression \
    --scaffold --allow-tools "$@" --ablation none --runs 1 --trust-plugin --no-publish
}

echo "=== 1/6: rr-negative-control (claude plugin eval, no Bash) ==="
run_plain_eval rr-negative-control Read Glob Grep AskUserQuestion

echo
echo "=== 2/6: rr-no-command-stop (claude plugin eval, no Bash) ==="
run_plain_eval rr-no-command-stop Read Glob Grep

echo
echo "=== 3/6: rr-scoped-unavailable (claude plugin eval, no Bash) ==="
run_plain_eval rr-scoped-unavailable Read Glob Grep

run_bash_case() {
  local case_name="$1"
  local scope_arg="$2"

  echo
  echo "=== Trying $case_name via 'claude plugin eval' (Bash granted) ==="
  local out
  set +e
  out="$(bash "$REPO_ROOT/evals/with-bash-eval-environment.sh" \
    claude plugin eval . --case "$case_name" --eval-dir evals/run-regression \
    --scaffold --allow-tools Read Glob Grep Bash --ablation none --runs 1 --trust-plugin --no-publish 2>&1)"
  local status=$?
  set -e
  echo "$out"

  if [ $status -eq 0 ]; then
    echo "$case_name: claude plugin eval succeeded — no manual step needed on this machine."
    return
  fi

  if [ "$status" -eq 69 ] || [ "$status" -eq 70 ]; then
    echo "$case_name: eval environment could not be prepared or restored safely; stopping." >&2
    return "$status"
  fi

  echo "$case_name: claude plugin eval failed; investigate the output above — it may be a real defect."
  echo "Falling back to a manual headless run with --dangerously-skip-permissions..."

  local run_dir
  run_dir=$(mktemp -d)
  echo "Run dir: $run_dir"
  (cd "$run_dir" && bash "$REPO_ROOT/evals/run-regression/$case_name/fixture.sh")

  local pre_status post_status
  pre_status=$(git -C "$REPO_ROOT" status --porcelain --ignored -- skills/run-regression evals/run-regression)

  local transcript="/tmp/run-regression-${case_name}-transcript.jsonl"
  (cd "$run_dir" && claude -p "/make-it-work:run-regression --autopilot $scope_arg" \
    --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
    --output-format stream-json --verbose > "$transcript" 2>&1)

  post_status=$(git -C "$REPO_ROOT" status --porcelain --ignored -- skills/run-regression evals/run-regression)
  if [ "$pre_status" != "$post_status" ]; then
    echo "WARNING: skills/run-regression or evals/run-regression changed during this run — investigate before trusting the result."
    diff <(echo "$pre_status") <(echo "$post_status") || true
  else
    echo "Real repo (scoped to skills/run-regression + evals/run-regression) untouched: OK"
  fi

  echo "$run_dir" > "/tmp/run-regression-${case_name}-rundir.txt"
  echo "$case_name run dir:   $run_dir"
  echo "$case_name transcript: $transcript"
  echo "Check its final message and $run_dir/.claude/run-regression-autopilot-log.jsonl against evals/run-regression/$case_name/graders/*.md"
}

run_bash_case rr-full-pass full
run_bash_case rr-full-fail full
run_bash_case rr-scoped-explicit domain-velocity

echo
echo "=== Done. Manual-path run dirs (if any) are saved to /tmp/run-regression-<case>-rundir.txt ==="
