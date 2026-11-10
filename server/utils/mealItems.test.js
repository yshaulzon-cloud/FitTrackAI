const test = require('node:test');
const assert = require('node:assert');
const { parseMealItems, withItems, sumItems, quantityOf, matchFood, allocate, splitComponents } = require('./mealItems');
const { mealPlans } = require('../data/mealPlans');

test('allocate: integer shares that add up exactly', () => {
  assert.deepStrictEqual(allocate(10, [1, 1, 1]).reduce((a, b) => a + b, 0), 10);
  assert.deepStrictEqual(allocate(0, [1, 2]), [0, 0]);
  assert.deepStrictEqual(allocate(7, [0, 0]).reduce((a, b) => a + b, 0), 7);
  assert.deepStrictEqual(allocate(100, [3, 1]), [75, 25]);
});

test('splitComponents splits on plus signs only', () => {
  assert.deepStrictEqual(splitComponents('2 ביצים + סלט עם שמן זית + לחם'), ['2 ביצים', 'סלט עם שמן זית', 'לחם']);
  assert.deepStrictEqual(splitComponents(''), []);
});

test('quantityOf: explicit grams, counts with a unit weight, fractions, default', () => {
  assert.deepStrictEqual(quantityOf('150 גרם חזה עוף'), { grams: 150, guessed: false });
  assert.deepStrictEqual(quantityOf('200 מ"ל חלב'), { grams: 200, guessed: false });
  assert.deepStrictEqual(quantityOf('2 ביצים קשות'), { grams: 100, guessed: true });
  assert.deepStrictEqual(quantityOf('פרוסת לחם מלא'), { grams: 30, guessed: true });
  assert.deepStrictEqual(quantityOf('חצי כוס אורז'), { grams: 120, guessed: true });
  assert.deepStrictEqual(quantityOf('סלט ירקות'), { grams: 100, guessed: true });
});

test('matchFood prefers the most specific key', () => {
  assert.ok(matchFood('150 גרם חזה עוף על הגריל'));
  assert.strictEqual(matchFood('xyzzy'), null);
});

test('a known meal is split into items that add up to the meal exactly', () => {
  const meal = { he: '150 גרם חזה עוף על הגריל + סלט ירקות עם כף שמן זית', en: 'x + y', calories: 320, protein: 35, carbs: 10, fat: 12 };
  const items = parseMealItems(meal);
  assert.strictEqual(items.length, 2);
  assert.deepStrictEqual(sumItems(items), { calories: 320, protein: 35, carbs: 10, fat: 12 });
  assert.strictEqual(items[0].estimated, false); // explicit grams of a known food
  assert.ok(items[0].calories > items[1].calories);
});

test('every plan in the data: items add up to each meal exactly, nothing is negative or NaN', () => {
  let meals = 0; let estimated = 0; let items = 0;
  for (const range of Object.values(mealPlans)) {
    for (const plan of range) {
      for (const meal of plan.meals) {
        meals++;
        const its = parseMealItems(meal);
        assert.ok(its.length >= 1, meal.he);
        assert.deepStrictEqual(sumItems(its), { calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat }, meal.he);
        for (const it of its) {
          items++; if (it.estimated) estimated++;
          assert.ok(it.name.he && it.name.en, meal.he);
          for (const k of ['calories', 'protein', 'carbs', 'fat', 'grams']) assert.ok(Number.isFinite(it[k]) && it[k] >= 0, `${meal.he}: ${k}`);
        }
      }
    }
  }
  assert.ok(meals >= 100, 'expected the full set of plans, got ' + meals);
  // information, not a gate: how much is a guess
  console.log(`# ${meals} meals, ${items} items, ${Math.round((100 * estimated) / items)}% estimated`);
});

test('withItems does not mutate the shared plan data', () => {
  const meal = { he: '2 ביצים + לחם', en: '2 eggs + bread', calories: 250, protein: 15, carbs: 20, fat: 10 };
  const copy = JSON.parse(JSON.stringify(meal));
  const out = withItems(meal);
  assert.deepStrictEqual(meal, copy);
  assert.ok(Array.isArray(out.items));
});
