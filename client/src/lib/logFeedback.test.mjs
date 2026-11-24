import test from 'node:test';
import assert from 'node:assert/strict';
import { remainingLine, describeLogResult, restoreValuesOf } from './logFeedback.mjs';

const target = { calories: 2210, protein: 150, carbs: 240, fat: 70 };
const res = (remaining, extra = {}) => ({
  meal: { description: '200 גרם חזה עוף', calories: 330, protein: 62, ...extra },
  target, remaining,
});

test('remaining line: calories and protein left', () => {
  assert.equal(remainingLine(res({ calories: 640, protein: 48 }), true), 'נשארו 640 קק״ל, 48 ג׳ חלבון להיום');
  assert.equal(remainingLine(res({ calories: 640, protein: 48 }), false), '640 kcal and 48 g protein left today');
});

test('remaining line: protein target already reached', () => {
  assert.equal(remainingLine(res({ calories: 300, protein: 0 }), true), 'נשארו 300 קק״ל להיום · יעד החלבון הושג');
  assert.equal(remainingLine(res({ calories: 300, protein: -12 }), false), '300 kcal left today · protein target reached');
});

test('remaining line: over the calorie target', () => {
  assert.equal(remainingLine(res({ calories: -290, protein: 20 }), true), 'עברת את יעד היום ב-290 קק״ל · חסרים עוד 20 ג׳ חלבון');
  assert.equal(remainingLine(res({ calories: -290, protein: -5 }), false), "290 kcal over today's target");
});

test('remaining line: exactly on the target counts as 0 left, not over', () => {
  assert.match(remainingLine(res({ calories: 0, protein: 10 }), true), /^נשארו 0 קק״ל/);
});

test('no target (or an empty response) → no line, no NaN', () => {
  assert.equal(remainingLine({ meal: {}, target: null, remaining: null }, true), null);
  assert.equal(remainingLine({ meal: {} }, false), null);
  assert.equal(remainingLine(null, true), null);
  assert.equal(remainingLine({ target: { calories: 0 }, remaining: { calories: 0, protein: 0 } }, true), null);
});

test('describeLogResult: what was added + where the day stands, no warning when nothing was guessed', () => {
  const d = describeLogResult(res({ calories: 640, protein: 48 }), true);
  assert.equal(d.hasNotes, false);
  assert.equal(d.text, 'נוסף: 200 גרם חזה עוף (330 קק״ל, 62 ג׳ חלבון)\nנשארו 640 קק״ל, 48 ג׳ חלבון להיום');
  const e = describeLogResult(res({ calories: 640, protein: 48 }), false);
  assert.match(e.text, /^Added: 200 גרם חזה עוף \(330 kcal, 62 g protein\)\n640 kcal and 48 g protein left today$/);
});

test('describeLogResult: still fine without a target', () => {
  const d = describeLogResult({ meal: { description: 'x', calories: 100, protein: 5 }, target: null, remaining: null }, true);
  assert.equal(d.text, 'נוסף: x (100 קק״ל, 5 ג׳ חלבון)');
});

test('describeLogResult: an assumed amount is stated, with the grams', () => {
  const d = describeLogResult(res({ calories: 100, protein: 10 }, {
    description: 'חזה עוף ואורז',
    items: [
      { name: 'chicken breast', nameHe: 'חזה עוף', grams: 100, quantityAssumed: true, basis: 'default' },
      { name: 'rice', nameHe: 'אורז', grams: 150, quantityAssumed: false, basis: 'written' },
    ],
  }), true);
  assert.equal(d.hasNotes, true);
  assert.match(d.text, /הנחנו: 100 ג׳ חזה עוף\./);
  assert.doesNotMatch(d.text, /150 ג׳ אורז/);
  const e = describeLogResult(res({ calories: 100, protein: 10 }, { items: [{ name: 'rice', nameHe: 'אורז', grams: 100, quantityAssumed: true }] }), false);
  assert.match(e.text, /we assumed: 100 g rice\./);
});

test('describeLogResult: words that were not recognised are listed as not counted', () => {
  const d = describeLogResult(res({ calories: 100, protein: 10 }, { unmatched: ['קינואה', 'סומסום'] }), true);
  assert.equal(d.hasNotes, true);
  assert.match(d.text, /לא זיהינו: קינואה, סומסום\. לא נספרו בחישוב\./);
  assert.match(describeLogResult(res({ calories: 1, protein: 1 }, { unmatched: ['quinoa'] }), false).text, /Not recognized: quinoa\. Not counted\./);
});

test('describeLogResult: a hand-typed meal says so', () => {
  assert.match(describeLogResult(res({ calories: 1, protein: 1 }, { source: 'manual' }), true).text, /הוזן ידנית/);
});

test('restoreValuesOf keeps every stored value, so a chip / an undo does not re-estimate', () => {
  assert.deepEqual(
    restoreValuesOf({ description: 'x', calories: 412, protein: 31, carbs: 40, fat: 12, fiber: 5, englishName: 'Chicken', source: 'manual', _id: 'a' }),
    { calories: 412, protein: 31, carbs: 40, fat: 12, fiber: 5, englishName: 'Chicken', source: 'manual' },
  );
  assert.deepEqual(restoreValuesOf({ calories: 10 }), { calories: 10, protein: 0, carbs: 0, fat: 0, fiber: 0, englishName: null, source: 'database' });
});
