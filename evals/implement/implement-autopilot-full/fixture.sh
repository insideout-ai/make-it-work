#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd -P)"

if [ -e .git ]; then
  echo "REFUSING to seed fixture: $(pwd) already has a .git" >&2
  exit 1
fi
case "$(pwd -P)" in
  "$REPO_ROOT"|"$REPO_ROOT"/*)
    echo "REFUSING to seed fixture inside the plugin repository" >&2
    exit 1
    ;;
esac

cp -R "$REPO_ROOT/evals/implement/fixture-base/." .
mkdir -p .claude/skills/domain-policy test
cp "$REPO_ROOT/evals/implement/fixture-base/src/policy.js" src/policy.js

printf '%s\n' '# Policy domain' '' \
  'This domain owns the allow-or-deny decision in `src/policy.js`.' \
  > .claude/skills/domain-policy/SKILL.md
printf '%s\n' '{"name":"implement-autopilot-fixture","private":true,"scripts":{"test":"node --test"}}' > package.json
printf '%s\n' \
  "const assert = require('node:assert/strict');" \
  "const test = require('node:test');" \
  "const { canProceed } = require('../src/policy');" \
  "test('member access remains allowed', () => assert.equal(canProceed('member'), true));" \
  "test('guest access remains denied', () => assert.equal(canProceed('guest'), false));" \
  > test/policy.test.js

git init -q -b main
git add -A
GIT_AUTHOR_NAME='fixture' GIT_AUTHOR_EMAIL='fixture@example.com' \
GIT_COMMITTER_NAME='fixture' GIT_COMMITTER_EMAIL='fixture@example.com' \
  git commit -q -m 'seed autopilot fixture'
node --test
