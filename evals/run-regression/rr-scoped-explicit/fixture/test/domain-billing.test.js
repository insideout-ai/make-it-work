const { test } = require('node:test');
const assert = require('node:assert');

// Out of scope for the rr-scoped-explicit eval case (requests only
// domain-velocity) — if run-regression's scoping ever overmatches and
// pulls this file in too, that's a real bug the grader should catch.
test('billing domain: createInvoice totals a line item', () => {
  assert.strictEqual(10 * 2, 20);
});
