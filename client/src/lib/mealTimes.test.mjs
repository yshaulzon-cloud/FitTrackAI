// Run with:  node --test src/lib/mealTimes.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { mealTimes, chronologicalOrder, nextMealIndex, eatenTotals } from './mealTimes.mjs';

const five = [
  { type: 'breakfast', calories: 300, protein: 20, carbs: 30, fat: 10 },
  { type: 'snack', calories: 150, protein: 10, carbs: 15, fat: 5 },
  { type: 'lunch', calories: 500, protein: 40, carbs: 50, fat: 15 },
  { type: 'snack', calories: 200, protein: 15, carbs: 20, fat: 6 },
  { type: 'dinner', calories: 450, protein: 35, carbs: 40, fat: 14 },
];

test('five-meal menu: no duplicate hours, two different snack times', () => {
  const t = mealTimes(five);
  assert.deepEqual(t, ['07:30', '10:30', '13:00', '16:30', '19:30']);
  assert.equal(new Set(t).size, t.length);
});

test('times are strictly increasing in plan order', () => {
  const odd = [{ type: 'snack' }, { type: 'snack' }, { type: 'snack' }, { type: 'dinner' }];
  const t = mealTimes(odd);
  assert.deepEqual(t, ['10:30', '11:00', '11:30', '19:30']);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
});

test('unknown meal type still gets a slot after the previous meal', () => {
  const t = mealTimes([{ type: 'breakfast' }, { type: 'mystery' }]);
  assert.deepEqual(t, ['07:30', '08:30']);
});

test('three-meal menu keeps the slot hours', () => {
  assert.deepEqual(mealTimes([{ type: 'breakfast' }, { type: 'lunch' }, { type: 'dinner' }]), ['07:30', '13:00', '19:30']);
});

test('empty / missing input', () => {
  assert.deepEqual(mealTimes([]), []);
  assert.deepEqual(mealTimes(undefined), []);
  assert.equal(nextMealIndex([], new Set()), -1);
});

test('nextMealIndex: first uneaten meal, -1 when all eaten', () => {
  assert.equal(nextMealIndex(five, new Set()), 0);
  assert.equal(nextMealIndex(five, new Set([0])), 1);
  assert.equal(nextMealIndex(five, new Set([0, 1, 3])), 2); // skipping ahead leaves lunch as next
  assert.equal(nextMealIndex(five, new Set([0, 1, 2, 3, 4])), -1);
});

test('the next meal is never repeated in the rest-of-day list (caller excludes it)', () => {
  const eaten = new Set([0, 1]);
  const next = nextMealIndex(five, eaten);
  const rest = chronologicalOrder(five).filter(i => i !== next);
  assert.equal(rest.length, five.length - 1);
  assert.ok(!rest.includes(next));
});

test('chronologicalOrder follows the clock even if the data order is shuffled', () => {
  const shuffled = [{ type: 'dinner' }, { type: 'breakfast' }];
  // dinner is first in the data, so it gets 19:30 and breakfast is pushed after it:
  // order stays the data order, never inventing a time earlier than the previous meal.
  assert.deepEqual(chronologicalOrder(shuffled), [0, 1]);
});

test('eatenTotals sums only ticked meals', () => {
  const t = eatenTotals(five, new Set([0, 2]));
  assert.deepEqual(t, { count: 2, calories: 800, protein: 60, carbs: 80, fat: 25 });
  assert.deepEqual(eatenTotals(five, new Set([9])), { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
});
