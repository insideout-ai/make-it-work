const { test } = require('node:test');
const assert = require('node:assert');

test('addition works', () => {
  assert.strictEqual(1 + 1, 2);
});

test('this one is deliberately broken', () => {
  assert.strictEqual(1 + 1, 3, 'deliberate fixture failure for rr-full-fail');
});
