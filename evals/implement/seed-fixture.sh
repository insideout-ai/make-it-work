#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CASE_FIXTURE="${1:?case fixture directory required}"

if [ -e ".git" ]; then
  echo "REFUSING to seed fixture: $(pwd) already has a .git" >&2
  exit 1
fi

REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
case "$(pwd -P)" in
  "$REPO_ROOT"|"$REPO_ROOT"/*)
    echo "REFUSING to seed fixture inside the plugin repository" >&2
    exit 1
    ;;
esac

cp -R "$SCRIPT_DIR/fixture-base/." .
cp -R "$CASE_FIXTURE/fixture-artifacts/." fixture-artifacts/
mv fixture-artifacts make-it-work

git init -q -b main
git add -A
GIT_AUTHOR_NAME="fixture" GIT_AUTHOR_EMAIL="fixture@example.com" \
GIT_COMMITTER_NAME="fixture" GIT_COMMITTER_EMAIL="fixture@example.com" \
git commit -q -m "seed implement feedback fixture"
git switch -q -c feedback-test

HEAD_HASH="$(git rev-parse HEAD)"
SPEC_HASH="$(git hash-object make-it-work/DEMO-spec.md)"
PLAN_PATH="$(awk '/^plan: / { print $2; exit }' make-it-work/DEMO-state.md)"
PLAN_HASH="$(awk 'BEGIN { skip=0 } /^## Execution Status$/ { skip=1; next } skip && /^## / { skip=0 } !skip { print }' "$PLAN_PATH" | git hash-object --stdin)"
EMPTY_FINGERPRINT="$(git hash-object --stdin < /dev/null)"

sed -i.bak \
  -e "s/<HEAD_HASH>/$HEAD_HASH/g" \
  -e "s/<SPEC_HASH>/$SPEC_HASH/g" \
  -e "s/<PLAN_HASH>/$PLAN_HASH/g" \
  -e "s/<WORKTREE_FINGERPRINT>/$EMPTY_FINGERPRINT/g" \
  make-it-work/DEMO-state.md
rm make-it-work/DEMO-state.md.bak
