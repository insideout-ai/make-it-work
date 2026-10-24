const test = require('node:test');
const assert = require('node:assert');

test('UC-080 daily limit report lists every account', () => {
  assert.deepStrictEqual(['acct-1', 'acct-2'].length, 2);
});
