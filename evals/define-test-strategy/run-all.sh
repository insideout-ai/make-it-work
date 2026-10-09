#!/usr/bin/env bash
# Runs all three define-test-strategy autopilot smoke-test cases.
#
# extend-autopilot and define-test-strategy-negative-control run fully automatically via
# `claude plugin eval` — this skill's only `.claude/`-protected output is
# `.claude/rules/testing-strategy.md` (plus the decision log, which is
# always under `.claude/` per the shared autopilot convention), and both
# cases are designed so that path is never written during the run:
# extend-autopilot's fixture seeds a testing-strategy.md that's already
# complete, so Phase 2 finds nothing to change there, and the one inherently
# unavoidable `.claude/` write — the decision log — is designed to fail
# gracefully (see the skill's Autopilot Mode section) rather than abort the
# run, so the rest of the pipeline (scaffolding, CLAUDE.md wiring) still
# completes and grades normally.
#
# fresh-autopilot needs to see Phase 2 actually WRITE
# `.claude/rules/testing-strategy.md` from scratch, which Claude Code
# protects even with explicit tool grants (see this directory's README).
# Run it manually, scoped strictly to a disposable temp directory (never
# the real repo).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/3: extend-autopilot (claude plugin eval) ==="
claude plugin eval . --case extend-autopilot \
  --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== 2/3: define-test-strategy-negative-control (claude plugin eval) ==="
claude plugin eval . --case define-test-strategy-negative-control \
  --scaffold --allow-tools Write Edit --ablation none --runs 1 --trust-plugin --no-publish

echo
echo "=== 3/3: fresh-autopilot (manual headless run, --dangerously-skip-permissions) ==="
run_dir=$(mktemp -d)
echo "Run dir: $run_dir"
(cd "$run_dir" && bash "$REPO_ROOT/evals/define-test-strategy/fresh-autopilot/fixture.sh")

pre_status=$(git -C "$REPO_ROOT" status --porcelain --ignored)

transcript="/tmp/define-test-strategy-fresh-autopilot-transcript.jsonl"
(cd "$run_dir" && claude -p "/make-it-work:define-test-strategy --autopilot" \
  --plugin-dir "$REPO_ROOT" --dangerously-skip-permissions \
  --output-format stream-json --verbose > "$transcript" 2>&1)

post_status=$(git -C "$REPO_ROOT" status --porcelain --ignored)
if [ "$pre_status" != "$post_status" ]; then
  echo "WARNING: $REPO_ROOT's git status changed during this run — investigate before trusting the result."
  diff <(echo "$pre_status") <(echo "$post_status") || true
else
  echo "Real repo untouched: OK"
fi

echo "$run_dir" > /tmp/define-test-strategy-fresh-autopilot-rundir.txt
echo "fresh-autopilot run dir:   $run_dir"
echo "fresh-autopilot transcript: $transcript"
echo "Check its files and make-it-work/define-test-strategy-autopilot-log.jsonl against evals/define-test-strategy/fresh-autopilot/graders/*.md"

echo
echo "=== Done. ==="
