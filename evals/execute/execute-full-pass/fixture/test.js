// plan-the-work progression test — step 1 (red state: greetFormally not yet defined)
const assert = require('assert');
const { greet, greetFormally } = require('./src/greeting');

assert.strictEqual(greet('Ann'), 'Hello, Ann!');
assert.strictEqual(greetFormally('Ann'), 'Good day, Ann.');

console.log('All tests passed.');
