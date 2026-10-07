const assert = require('node:assert/strict');
const test = require('node:test');

test('deliberate unrelated gate failure for the release rehearsal', () => {
  assert.equal('expected', 'deliberate failure');
});
