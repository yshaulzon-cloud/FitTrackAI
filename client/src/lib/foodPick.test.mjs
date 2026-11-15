import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultGrams, parseGrams, portionNumbers, shareOfTarget, pickPayload } from './foodPick.mjs';

const chicken = { name: 'חזה עוף', nameHe: 'חזה עוף', nameEn: 'chicken breast', cal: 165, p: 31, c: 0, f: 3.6, fb: 0, serving: null };
const egg = { name: 'ביצים', nameHe: 'ביצים', nameEn: 'eggs', cal: 155, p: 13, c: 1.1, f: 11, fb: 0, serving: 50 };

test('the quantity opens at one serving when the food has one, else 100 g', () => {
  assert.equal(defaultGrams(egg), 50);
  assert.equal(defaultGrams(chicken), 100);
  assert.equal(defaultGrams(null), 100);
});

test('typed grams: whole numbers 1–2000 only', () => {
  assert.equal(parseGrams('150'), 150);
  assert.equal(parseGrams(' 12,6 '), 13);
  for (const bad of ['', '   ', 'abc', '0', '-5', '2001', null, undefined, 'NaN']) assert.equal(parseGrams(bad), null, String(bad));
});

test('the numbers scale with the weight (200 g chicken breast = 2 × 165 kcal)', () => {
  const n = portionNumbers(chicken, 200);
  assert.equal(n.calories, 330);
  assert.equal(n.protein, 62);
  assert.equal(n.fat, 7);
  assert.equal(portionNumbers(egg, 100).calories, 155);
  assert.equal(portionNumbers(egg, 50).calories, 78);
});

test('share of the target — and no division by zero when no target is loaded', () => {
  assert.equal(shareOfTarget(330, 2200), 15);
  assert.equal(shareOfTarget(62, 150), 41);
  for (const t of [0, null, undefined, NaN, -1]) assert.equal(shareOfTarget(330, t), null);
});

test('the log payload carries the exact numbers shown, a readable description and the English name', () => {
  const p = pickPayload(chicken, 200, true);
  assert.equal(p.description, '200 גרם חזה עוף');
  assert.deepEqual(p.nutrition, { calories: 330, protein: 62, carbs: 0, fat: 7, fiber: 0, englishName: 'chicken breast', source: 'database' });
  assert.equal(pickPayload(chicken, 200, false).description, '200 g chicken breast');
  // a food with only one name still gets a description
  assert.equal(pickPayload({ ...chicken, nameHe: null, nameEn: null }, 100, true).description, '100 גרם חזה עוף');
});
