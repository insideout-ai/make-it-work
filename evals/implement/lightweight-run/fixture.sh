#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
cp -R "$SCRIPT_DIR/../fixture-base/." .
# The base's seeded run artifacts belong to resumed cases; this is a fresh run.
rm -rf fixture-artifacts
mkdir -p test
printf '%s\n' "const DENIED_MESSAGE = 'Acess denied';" '' 'module.exports = { DENIED_MESSAGE };' > src/messages.js
printf '%s\n' '{"name":"implement-lightweight-fixture","private":true,"scripts":{"test":"node --test"}}' > package.json
printf '%s\n' \
  "const assert = require('node:assert/strict');" \
  "const test = require('node:test');" \
  "const { canProceed } = require('../src/policy');" \
  "test('member access is allowed', () => assert.equal(canProceed('member'), true));" \
  "test('guest access is denied', () => assert.equal(canProceed('guest'), false));" \
  > test/policy.test.js
git init -q -b main
git add -A
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Policy app with a typo in the denial message'
node --test
