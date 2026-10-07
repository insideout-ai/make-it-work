const assert = require('node:assert/strict');
const test = require('node:test');
const { canProceed } = require('../src/policy');

test('existing member access remains allowed', () => assert.equal(canProceed('member'), true));
test('guest access remains denied', () => assert.equal(canProceed('guest'), false));
