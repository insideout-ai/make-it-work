#!/usr/bin/env bash
# Seeds an adaptive Guided run in Lightweight mode whose second review found a
# repeat offender (#2 introduced by the fix of #1, same region). The Lightweight
# changes are left uncommitted, as a real run leaves them.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"

cp -R "$SCRIPT_DIR/../fixture-base/." .
rm -rf fixture-artifacts
mkdir -p make-it-work test
cp -R "$SCRIPT_DIR/fixture/run" make-it-work/DEMO
printf '%s\n' '{"name":"implement-escalation-fixture","private":true,"scripts":{"test":"node --test"}}' > package.json
printf '%s\n' \
  "const assert = require('node:assert/strict');" \
  "const test = require('node:test');" \
  "const { canProceed } = require('../src/policy');" \
  "test('member access is allowed', () => assert.equal(canProceed('member'), true));" \
  "test('guest access is denied', () => assert.equal(canProceed('guest'), false));" \
  > test/policy.test.js

git init -q -b main
git add -A
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Policy app with a Lightweight run in progress'
git switch -q -c DEMO

# Lightweight implementation after fix round 1: admins pass, but so does every unknown role.
printf '%s\n' 'function canProceed(role) {' "  return role !== 'guest';" '}' '' 'module.exports = { canProceed };' > src/policy.js
node --test >/dev/null

HEAD_HASH="$(git rev-parse HEAD)"
SPEC_HASH="$(git hash-object make-it-work/DEMO/DEMO-spec.md)"
FINGERPRINT="$({ git diff HEAD --binary -- . ':!make-it-work'; git ls-files --others --exclude-standard -z -- . ':!make-it-work' | xargs -0 -I{} git hash-object {}; } | git hash-object --stdin)"
PLUGIN_VERSION="$(node -p "require('$REPO_ROOT/.claude-plugin/plugin.json').version")"
sed -i.bak \
  -e "s/<HEAD_HASH>/$HEAD_HASH/" \
  -e "s/<SPEC_HASH>/$SPEC_HASH/" \
  -e "s/<WORKTREE_FINGERPRINT>/$FINGERPRINT/" \
  -e "s/<PLUGIN_VERSION>/$PLUGIN_VERSION/" \
  make-it-work/DEMO/DEMO-state.md
rm make-it-work/DEMO/DEMO-state.md.bak

# The seeded review must route to an escalation, and the dashboard must render.
node "$REPO_ROOT/skills/implement/scripts/handoff.mjs" next --root . \
  --handoff make-it-work/DEMO/DEMO-handoffs/review-2.json \
  --previous-review make-it-work/DEMO/DEMO-handoffs/review-1.json \
  --state make-it-work/DEMO/DEMO-state.md | grep -q '"operation":"escalate"'
node "$REPO_ROOT/skills/implement/scripts/dashboard-checkpoint.mjs" render --state make-it-work/DEMO/DEMO-state.md >/dev/null
