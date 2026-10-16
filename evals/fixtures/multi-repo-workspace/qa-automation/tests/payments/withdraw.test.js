// @covers payments-api:UC-08
const test = require('node:test');
const assert = require('node:assert');
const { withdraw } = require('../../../payments-api/src/withdraw.js');

// Behavior test for POST /payments/withdraw.
test('POST /payments/withdraw debits the account', () => {
  assert.strictEqual(withdraw(300, 100), 200);
});

test('POST /payments/withdraw rejects an overdraft', () => {
  assert.throws(() => withdraw(50, 100), /insufficient funds/);
});
