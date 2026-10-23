const test = require('node:test');
const assert = require('node:assert');
const { withdraw, MAX_WITHDRAWAL } = require('../src/withdraw.js');

test('withdraw within the velocity limit reduces the balance', () => {
  assert.strictEqual(withdraw(5000, 200), 4800);
});

test('withdraw above the velocity limit is rejected', () => {
  assert.throws(() => withdraw(5000, MAX_WITHDRAWAL + 1), /velocity limit exceeded/);
});
