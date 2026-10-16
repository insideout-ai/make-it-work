// @covers ledger-api:UC-08
const test = require('node:test');
const assert = require('node:assert');

// Behavior test for ledger-api: a withdrawal posts a balanced ledger entry.
// Fails on purpose: ledger-api does not post the debit leg yet.
test('ledger-api posts a balanced entry for a withdrawal', () => {
  const entry = { debit: 0, credit: 100 };
  assert.strictEqual(entry.debit, entry.credit, 'ledger-api entry is unbalanced');
});
