const { test } = require('node:test');
const assert = require('node:assert');

test('addition works', () => {
  assert.strictEqual(1 + 1, 2);
});

test('string concatenation works', () => {
  assert.strictEqual('a' + 'b', 'ab');
});
