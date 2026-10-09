#!/usr/bin/env bash
# Runs all three review-the-pr autopilot smoke-test cases.
#
# negative-control runs fully automatically via `claude plugin eval`.
# autopilot-bare and autopilot-full-info need a manual headless run instead —
# not because of `.claude/` write protection (this skill's own output,
# make-it-work/<TICKET>-review.md, lives outside `.claude/`), but because
# review-the-pr's Step 1 needs `git diff`/`git branch -r` via Bash, and
# granting Bash to a `claude plugin eval` case fails outright on this machine
# (a Docker credential-store symlink under ~/.docker defeats the Bash
# sandbox's exclusion rules — see evals/review-the-pr/README.md and spec
# §1.5). On top of that, the autopilot decision log
# (make-it-work/review-the-pr-autopilot-log.jsonl) is under the always-protected
# `.claude/` path, which separately needs `--dangerously-skip-permissions`
# regardless of the Bash issue. Scope is a disposable mktemp dir only, and a
# git-status diff on this repo (scoped to skills/review-the-pr and
# evals/review-the-pr) confirms nothing leaked into it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/3: review-the-pr-negative-control (claude plugin eval) ==="
claude plugin eval . --case review-the-pr-negative-control --scaffold --allow-tools Read Glob Grep \
  --ablation none --runs 1 --trust-plugin --no-publish

run_case() {
  local case_name="$1"
  echo
  echo "=== Running $case_name (manual headless run, --dangerously-skip-permissions) ==="

  # Branch + HEAD commit, not just a scoped git-status diff: a scoped path
  # filter alone can miss a seeding script that ran against the real repo by
  # mistake (wrong cwd) and switched HEAD/branch or added commits elsewhere
  # in the tree — exactly what happened once during this suite's own
  # development (see the README's "Incident" section). This snapshot MUST be
  # taken before fixture.sh runs (not just before the claude invocation) —
  # fixture.sh itself is the step that does the git init/commit/checkout, so
  # snapshotting any later would have missed the actual incident entirely.
  local pre_branch pre_head pre_status post_branch post_head post_status
  pre_branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)
  pre_head=$(git -C "$REPO_ROOT" rev-parse HEAD)
  pre_status=$(git -C "$REPO_ROOT" status --porcelain --ignored -- skills/review-the-pr evals/review-the-pr make-it-work make-it-work/review-the-pr-autopilot-log.jsonl)

  local run_dir
  run_dir=$(mktemp -d)
  echo "Run dir: $run_dir"
  (cd "$run_dir" && bash "$REPO_ROOT/evals/review-the-pr/$case_name/fixture.sh")

  # Strip the prompt.md frontmatter (everything up to and including the
  # second `---` line) so each case's actual invocation text is used —
  # autopilot-full-info's prompt includes a PR link and requirements text
  # ahead of the slash command, autopilot-bare's is just the command.
  local prompt_text
  prompt_text=$(awk 'BEGIN{d=0} /^---$/{d++; next} d>=2{print}' "$REPO_ROOT/evals/review-the-pr/$case_name/prompt.md")

  local transcript="/tmp/review-the-pr-${case_name}-transcript.jsonl"
  (cd "$run_dir" && claude -p "$prompt_text" \
    --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
    --output-format stream-json --verbose > "$transcript" 2>&1)

  post_branch=$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)
  post_head=$(git -C "$REPO_ROOT" rev-parse HEAD)
  post_status=$(git -C "$REPO_ROOT" status --porcelain --ignored -- skills/review-the-pr evals/review-the-pr make-it-work make-it-work/review-the-pr-autopilot-log.jsonl)
  if [ "$pre_branch" != "$post_branch" ] || [ "$pre_head" != "$post_head" ]; then
    echo "CRITICAL: $REPO_ROOT's checked-out branch or HEAD commit changed during this run!"
    echo "  branch: $pre_branch -> $post_branch"
    echo "  head:   $pre_head -> $post_head"
    echo "  This means something ran against the real repo instead of \$run_dir. Stop and investigate before doing anything else — do not assume the scoped status check below is sufficient."
  elif [ "$pre_status" != "$post_status" ]; then
    echo "WARNING: $REPO_ROOT's scoped git status changed during this run — investigate before trusting the result."
    diff <(echo "$pre_status") <(echo "$post_status") || true
  else
    echo "Real repo untouched: OK (branch, HEAD, and scoped status all unchanged)"
  fi

  echo "$run_dir" > "/tmp/review-the-pr-${case_name}-rundir.txt"
  echo "$case_name run dir:   $run_dir"
  echo "$case_name transcript: $transcript"
  echo "Check $run_dir/make-it-work/*-review.md and $run_dir/make-it-work/review-the-pr-autopilot-log.jsonl against evals/review-the-pr/$case_name/graders/*.md"
}

run_case autopilot-bare
run_case autopilot-full-info

echo
echo "=== Done. Run dir paths are saved to /tmp/review-the-pr-<case>-rundir.txt ==="
