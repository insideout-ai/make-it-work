#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../../assert-disposable-cwd.sh"
bash "$SCRIPT_DIR/../no-tooling/fixture.sh"
mkdir -p test
cat > package.json <<'JSON'
{"name":"policy-app","private":true,"scripts":{"test":"node --test"}}
JSON
cat > test/policy.test.js <<'JS'
const test = require('node:test');
const assert = require('node:assert/strict');
const { canProceed } = require('../src/policy');
test('members proceed', () => assert.equal(canProceed('member'), true));
test('guests are denied', () => assert.equal(canProceed('guest'), false));
JS
git add package.json test
git -c user.name=fixture -c user.email=fixture@example.test commit -qm 'Existing automation without a strategy'
