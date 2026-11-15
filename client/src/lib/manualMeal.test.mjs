import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManualMeal, manualErrorText, MANUAL_LIMITS } from './manualMeal.mjs';

test('a complete entry becomes the description + numbers the server expects, marked manual', () => {
  const r = validateManualMeal({ name: '  חטיף חלבון ', calories: '210', protein: '20', carbs: '18', fat: '7' });
  assert.deepEqual(r, { ok: true, description: 'חטיף חלבון', nutrition: { calories: 210, protein: 20, carbs: 18, fat: 7, source: 'manual' } });
});

test('only calories are required — empty protein / carbs / fat count as 0', () => {
  const r = validateManualMeal({ name: 'מרק', calories: '120', protein: '', carbs: '', fat: undefined });
  assert.equal(r.ok, true);
  assert.deepEqual(r.nutrition, { calories: 120, protein: 0, carbs: 0, fat: 0, source: 'manual' });
});

test('a decimal comma is read, and values are rounded', () => {
  const r = validateManualMeal({ name: 'x', calories: '99,6', protein: '12.4', carbs: '', fat: '' });
  assert.equal(r.ok, true);
  assert.equal(r.nutrition.calories, 100);
  assert.equal(r.nutrition.protein, 12);
});

test('missing name / calories are reported', () => {
  const r = validateManualMeal({ name: '   ', calories: '', protein: '', carbs: '', fat: '' });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, { name: 'required', calories: 'required' });
});

test('negative, non-numeric and over-limit numbers are rejected per field', () => {
  const r = validateManualMeal({ name: 'x', calories: '-1', protein: 'abc', carbs: String(MANUAL_LIMITS.carbs + 1), fat: String(MANUAL_LIMITS.fat) });
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, { calories: 'invalid', protein: 'invalid', carbs: 'too-big' });
});

test('0 kcal is allowed (a glass of water)', () => {
  assert.equal(validateManualMeal({ name: 'מים', calories: '0', protein: '', carbs: '', fat: '' }).ok, true);
});

test('every error code has a sentence in both languages', () => {
  for (const field of ['name', 'calories', 'protein', 'carbs', 'fat']) {
    for (const code of ['required', 'invalid', 'too-big', 'too-long']) {
      assert.ok(manualErrorText(field, code, true).length > 5, `he ${field}/${code}`);
      assert.ok(manualErrorText(field, code, false).length > 5, `en ${field}/${code}`);
    }
  }
  assert.match(manualErrorText('protein', 'too-big', false), /400/);
});
