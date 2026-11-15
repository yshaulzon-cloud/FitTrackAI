// Run with:  node --test src/lib/mealEdit.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureItems, totalsOf, scaleItem, itemFromFood, setItemGrams, removeItem, addFood, replaceWithFood, rebuildMeal, applyMealToMenu, logValuesOf } from './mealEdit.mjs';

const item = (he, grams, calories, protein, carbs, fat) => ({ name: { he, en: he + '-en' }, grams, calories, protein, carbs, fat, estimated: false });
const meal = { type: 'lunch', he: 'עוף + אורז', en: 'chicken + rice', calories: 500, protein: 40, carbs: 50, fat: 10, items: [item('עוף', 150, 250, 35, 0, 6), item('אורז', 200, 250, 5, 50, 4)] };
const rice = { name: 'קינואה', cal: 120, p: 4.4, c: 21, f: 1.9, fb: 2.8 };

test('ensureItems: uses the server items, or wraps the whole meal in one item', () => {
  assert.equal(ensureItems(meal), meal.items);
  const legacy = ensureItems({ he: 'x', en: 'y', calories: 300, protein: 20, carbs: 30, fat: 10 });
  assert.equal(legacy.length, 1);
  assert.deepEqual(totalsOf(legacy), { calories: 300, protein: 20, carbs: 30, fat: 10 });
  assert.equal(legacy[0].estimated, true);
});

test('scaleItem: nutrition scales with the weight', () => {
  const half = scaleItem(meal.items[0], 75);
  assert.deepEqual([half.grams, half.calories, half.protein, half.fat], [75, 125, 18, 3]);
  const dbl = scaleItem(meal.items[1], 400);
  assert.deepEqual([dbl.calories, dbl.carbs], [500, 100]);
});

test('scaleItem clamps silly weights and never divides by zero', () => {
  assert.equal(scaleItem(meal.items[0], 0).grams, 5);
  assert.equal(scaleItem(meal.items[0], 99999).grams, 2000);
  assert.ok(Number.isFinite(scaleItem({ ...meal.items[0], grams: 0 }, 50).calories));
});

test('itemFromFood: per-100g values at the chosen weight, not estimated', () => {
  const it = itemFromFood(rice, 150);
  assert.deepEqual([it.grams, it.calories, it.protein, it.carbs, it.fat, it.estimated], [150, 180, 7, 32, 3, false]);
});

test('edit operations return new arrays and never mutate', () => {
  const copy = JSON.parse(JSON.stringify(meal.items));
  setItemGrams(meal.items, 0, 300); removeItem(meal.items, 0); addFood(meal.items, rice); replaceWithFood(meal.items, 1, rice);
  assert.deepEqual(meal.items, copy);
});

test('replaceWithFood keeps the portion size; addFood appends; removeItem drops', () => {
  const rep = replaceWithFood(meal.items, 1, rice);
  assert.equal(rep[1].grams, 200);
  assert.equal(rep[1].calories, 240);
  assert.equal(rep[0], meal.items[0]);
  assert.equal(addFood(meal.items, rice, 50).length, 3);
  assert.equal(removeItem(meal.items, 0).length, 1);
});

test('rebuildMeal: totals equal the sum of the items, text follows the items, flagged edited', () => {
  const items = replaceWithFood(setItemGrams(meal.items, 0, 300), 1, rice);
  const m = rebuildMeal(meal, items);
  assert.deepEqual(totalsOf(items), { calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat });
  assert.equal(m.he, 'עוף + קינואה');
  assert.equal(m.en, 'עוף-en + קינואה');
  assert.equal(m.edited, true);
  assert.equal(m.type, 'lunch');
});

test('removing every item gives an empty (zero) meal rather than NaN', () => {
  const m = rebuildMeal(meal, []);
  assert.deepEqual(logValuesOf(m), { calories: 0, protein: 0, carbs: 0, fat: 0 });
});

test('applyMealToMenu recomputes the menu totals and leaves other meals alone', () => {
  const menu = { totalCalories: 900, meals: [{ type: 'breakfast', calories: 400, protein: 20, carbs: 40, fat: 10 }, meal] };
  const edited = rebuildMeal(meal, setItemGrams(meal.items, 0, 75));
  const out = applyMealToMenu(menu, 1, edited);
  assert.equal(out.meals[0], menu.meals[0]);
  assert.equal(out.totalCalories, 400 + edited.calories);
  assert.equal(menu.meals[1], meal); // input untouched
});

import { menuHasUserState } from './mealEdit.mjs';
test('menuHasUserState: eaten today or edited meals protect the menu from a rebuild', () => {
  const menu = { meals: [{ type: 'lunch' }, { type: 'dinner' }] };
  assert.equal(menuHasUserState(menu, { date: 'D', idxs: [] }, 'D'), false);
  assert.equal(menuHasUserState(menu, { date: 'D', idxs: [0] }, 'D'), true);
  assert.equal(menuHasUserState(menu, { date: 'OLD', idxs: [0] }, 'D'), false); // yesterday's ticks do not count
  assert.equal(menuHasUserState({ meals: [{ edited: true }] }, { date: 'D', idxs: [] }, 'D'), true);
  assert.equal(menuHasUserState(null, null, 'D'), false);
});
