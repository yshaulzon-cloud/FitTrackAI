// Run: cd server && node --test utils/logFeedback.test.js
const test = require('node:test');
const assert = require('node:assert');
const { feedbackFor } = require('./logFeedback');

const targets = {
  today: { calories: 2210, protein: 150, carbs: 240, fat: 70, macros: {} },
  dayType: { type: 'training' },
};

test('remaining = today\'s target − what is logged, with the day type', () => {
  const f = feedbackFor({ totalCalories: 1570, totalProtein: 102, totalCarbs: 180, totalFat: 40 }, targets);
  assert.deepStrictEqual(f.target, { calories: 2210, protein: 150, carbs: 240, fat: 70 });
  assert.deepStrictEqual(f.remaining, { calories: 640, protein: 48, carbs: 60, fat: 30 });
  assert.strictEqual(f.dayType, 'training');
});

test('over the target gives a negative remaining (the app words it as "over")', () => {
  const f = feedbackFor({ totalCalories: 2500, totalProtein: 160, totalCarbs: 300, totalFat: 90 }, targets);
  assert.strictEqual(f.remaining.calories, -290);
  assert.strictEqual(f.remaining.protein, -10);
});

test('an empty day leaves the whole target', () => {
  const f = feedbackFor({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }, targets);
  assert.deepStrictEqual(f.remaining, f.target);
});

test('no targets (profile incomplete) → nothing to compare, no NaN, no invented target', () => {
  for (const bad of [null, undefined, {}, { today: null }, { today: { calories: 0 } }, { today: { calories: NaN } }]) {
    assert.deepStrictEqual(feedbackFor({ totalCalories: 500 }, bad), { target: null, remaining: null, dayType: null });
  }
});

test('missing daily totals count as 0', () => {
  const f = feedbackFor(undefined, targets);
  assert.strictEqual(f.remaining.calories, 2210);
});
