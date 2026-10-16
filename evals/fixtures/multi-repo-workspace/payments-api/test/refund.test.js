const test = require('node:test');
const assert = require('node:assert');

test('refund adds the amount back to the balance', () => {
  const refund = (balance, amount) => balance + amount;
  assert.strictEqual(refund(100, 25), 125);
});
