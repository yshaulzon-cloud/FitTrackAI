// Run with:  node --test utils/workoutCycle.test.js   (from server/)
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCycleStatus } = require('./calculations');

const at = (d, h = 9) => new Date(2026, 10, d, h, 0);
const w = (date) => ({ date });
const NONE = { limitReached: false, cycleCount: 0, cycleEndsAt: null };

test('no workouts', () => {
  assert.deepEqual(calculateCycleStatus([], 4), NONE);
  assert.deepEqual(calculateCycleStatus(null, 4), NONE);
});

test('a full cycle: limit reached, ends 7 days after its first workout', () => {
  const s = calculateCycleStatus([w(at(4)), w(at(2)), w(at(3))], 3, at(5).getTime());
  assert.deepEqual(s, { limitReached: true, cycleCount: 3, cycleEndsAt: at(9).toISOString() });
});

test('a cycle that is not full has no end time', () => {
  const s = calculateCycleStatus([w(at(2)), w(at(3))], 3, at(5).getTime());
  assert.deepEqual(s, { limitReached: false, cycleCount: 2, cycleEndsAt: null });
});

test('once the 7 days are over the count is 0', () => {
  const full = [w(at(2)), w(at(3)), w(at(4))];
  assert.equal(calculateCycleStatus(full, 3, at(9, 8).getTime()).limitReached, true);
  assert.deepEqual(calculateCycleStatus(full, 3, at(9, 9).getTime()), NONE);
  assert.deepEqual(calculateCycleStatus([w(at(2))], 3, at(20).getTime()), NONE);
});

test('more than 30 workouts: the cycle comes from the whole history, not the latest 30', () => {
  // Goal 4, a workout every 2 days. Cycles open every 8 days from workout #1, so
  // after 45 workouts the running cycle holds exactly one (#45).
  const all = Array.from({ length: 45 }, (_, i) => w(new Date(2026, 0, 1 + i * 2, 9)));
  const now = new Date(all[44].date.getTime() + 3600000).getTime();
  const full = calculateCycleStatus(all, 4, now);
  assert.equal(full.cycleCount, 1);
  assert.equal(full.limitReached, false);
  // The latest 30 start mid-cycle and give another answer: why the route passes every date.
  assert.notEqual(calculateCycleStatus(all.slice(-30), 4, now).cycleCount, full.cycleCount);
  // newest-first (the order the route loads them in) gives the same result
  assert.deepEqual(calculateCycleStatus([...all].reverse(), 4, now), full);
});
