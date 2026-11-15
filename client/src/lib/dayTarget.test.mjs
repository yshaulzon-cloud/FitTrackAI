// Run with:  node --test src/lib/dayTarget.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { todaysNutrition, historyTargetFor, adherencePct, hasTargets } from './dayTarget.mjs';

test('hasTargets: only a real positive calorie target counts — never a default', () => {
  assert.equal(hasTargets({ calorieTarget: 1700 }), true);
  assert.equal(hasTargets(null), false);
  assert.equal(hasTargets(undefined), false);
  assert.equal(hasTargets({}), false);
  assert.equal(hasTargets({ calorieTarget: 0 }), false);
  assert.equal(hasTargets({ calorieTarget: NaN }), false);
  assert.equal(hasTargets({ calorieTarget: '2000' }), false); // a string is not a number from the server
});

const nutrition = {
  tdee: 2500, calorieTarget: 2000, macros: { protein: 150, carbs: 220, fat: 60 },
  today: { calorieTarget: 1700, macros: { protein: 150, carbs: 145, fat: 60 }, dayType: { type: 'rest', deltaPct: -15 } },
};

test('todaysNutrition: the day-facing block carries today\'s target and keeps the base', () => {
  const n = todaysNutrition(nutrition);
  assert.equal(n.calorieTarget, 1700);
  assert.equal(n.macros.carbs, 145);
  assert.equal(n.baseCalorieTarget, 2000);
  assert.equal(n.dayType.type, 'rest');
  assert.equal(n.tdee, 2500); // everything else passes through
});

test('todaysNutrition: no `today` (old server) leaves the block untouched; null stays null', () => {
  const plain = { calorieTarget: 2000, macros: { protein: 150 } };
  assert.equal(todaysNutrition(plain), plain);
  assert.equal(todaysNutrition(null), null);
  assert.equal(todaysNutrition(undefined), null);
  assert.equal(todaysNutrition({ ...plain, today: { calorieTarget: 0 } }).calorieTarget, 2000); // a zero target is never used
});

test('historyTargetFor: a logged day is judged by its own snapshot, not today\'s target', () => {
  assert.equal(historyTargetFor({ targetSnapshot: { calories: 2120 } }, 2000), 2120);
});

test('historyTargetFor: a day without a snapshot falls back; junk snapshots are ignored', () => {
  assert.equal(historyTargetFor({}, 2000), 2000);
  assert.equal(historyTargetFor(null, 2000), 2000);
  assert.equal(historyTargetFor({ targetSnapshot: null }, 2000), 2000);
  assert.equal(historyTargetFor({ targetSnapshot: { calories: 0 } }, 2000), 2000);
  assert.equal(historyTargetFor({ targetSnapshot: { calories: 'x' } }, 2000), 2000);
});

test('adherencePct: judged against each day\'s own target — eating the rest-day target on a rest day is 100%', () => {
  assert.equal(adherencePct([{ consumed: 1700, target: 1700 }, { consumed: 2120, target: 2120 }]), 100);
  // the same food judged against one flat 2000 would look worse:
  assert.equal(adherencePct([{ consumed: 1700, target: 2000 }, { consumed: 2120, target: 2000 }]), 96);
  assert.equal(adherencePct([{ consumed: 1700, target: 2000 }]), 85);
});

test('adherencePct: unlogged days and empty input are not judged', () => {
  assert.equal(adherencePct([]), 0);
  assert.equal(adherencePct([{ consumed: 0, target: 2000 }]), 0);
  assert.equal(adherencePct(undefined), 0);
});
