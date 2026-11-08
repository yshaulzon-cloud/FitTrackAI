const test = require('node:test');
const assert = require('node:assert');
const { tryConsume, _reset } = require('./aiBudget');

test('allows up to the limit, then refuses', () => {
  _reset();
  for (let i = 0; i < 3; i++) assert.strictEqual(tryConsume('u1', 1000 + i, 3, 60000), true);
  assert.strictEqual(tryConsume('u1', 1010, 3, 60000), false);
});

test('the budget is per user', () => {
  _reset();
  for (let i = 0; i < 3; i++) tryConsume('a', 1000, 3, 60000);
  assert.strictEqual(tryConsume('a', 1001, 3, 60000), false);
  assert.strictEqual(tryConsume('b', 1001, 3, 60000), true);
});

test('calls older than the window stop counting', () => {
  _reset();
  for (let i = 0; i < 3; i++) tryConsume('u', 1000, 3, 60000);
  assert.strictEqual(tryConsume('u', 1000 + 59999, 3, 60000), false);
  assert.strictEqual(tryConsume('u', 1000 + 60001, 3, 60000), true);
});
