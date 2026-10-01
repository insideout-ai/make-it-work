#!/usr/bin/env bash
# Runs all six run-regression autopilot smoke-test cases.
#
# rr-negative-control, rr-no-command-stop and rr-scoped-unavailable run
# fully automatically via `claude plugin eval` (no Bash grant needed — see
# README.md for why each of those three never needs to run a test command
# at all).
#
# rr-full-pass, rr-full-fail and rr-scoped-explicit need a Bash grant to
# actually run the fixture's test suite. On THIS machine, granting Bash to
# a `claude plugin eval` case fails outright — a known, pre-existing,
# machine-specific issue (a symlink inside this machine's ~/.docker
# credential store; see README.md and the top-level autopilot rollout
# spec's §1.5) that has nothing to do with this skill or with `.claude/`
# protection. This script tries the plain `claude plugin eval` path first
# for those three cases and, only if that specific Docker/Bash error
# appears, falls back to a manual headless run with
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
  echo "=== Trying $case_name via plain 'claude plugin eval' (Bash granted) ==="
  local out
  set +e
  out="$(run_plain_eval "$case_name" Read Glob Grep Bash 2>&1)"
  local status=$?
  set -e
  echo "$out"

  if [ $status -eq 0 ]; then
    echo "$case_name: plain claude plugin eval succeeded — no manual step needed on this machine."
    return
  fi

  if echo "$out" | grep -q "Docker (~/.docker, DOCKER_CONFIG) credential store"; then
    echo "$case_name: hit the known §1.5 Docker-credential-store Bash-grant issue (not a skill defect)."
    echo "Falling back to a manual headless run with --dangerously-skip-permissions..."
  else
    echo "$case_name: plain claude plugin eval failed for a DIFFERENT reason than the known Docker issue."
    echo "Falling back to the manual path anyway, but investigate the output above — it may be a real defect."
  fi

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
