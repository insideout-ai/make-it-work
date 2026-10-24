const { test } = require('node:test');
const assert = require('node:assert');

// Release-notes formatting. It mentions velocity only in plain text (the
// notes summarize sprint velocity) but does not test velocity calculation, so
// velocity-app:domain-velocity must not select this file.
test('release notes: heading mentions sprint velocity', () => {
  assert.ok('Sprint velocity summary'.toLowerCase().includes('velocity'));
});
