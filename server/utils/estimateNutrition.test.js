// Regression tests for free-text meal estimation (estimateNutrition) and the
// food database. These describe the behaviour we WANT; several fail on purpose
// until the fixes land (nutrition-fix round, tasks 8–10). Findings F1–F5.
//
// Run: cd server && node --test utils/estimateNutrition.test.js
const test = require('node:test');
const assert = require('node:assert');
const { estimateNutrition, FOOD_DB } = require('./calculations');

const kcal = (text) => {
  const r = estimateNutrition(text);
  return r ? r.calories : null;
};
const within = (value, lo, hi, msg) =>
  assert.ok(value !== null && value >= lo && value <= hi, `${msg}: got ${value}, expected ${lo}–${hi}`);

// ── F1: the written quantity must be used ─────────────────────────────────
test('F1: "200 גרם חזה עוף" is 200 g of chicken breast, not 100 g', () => {
  const r = estimateNutrition('200 גרם חזה עוף');
  assert.ok(r, 'must be recognised');
  within(r.calories, 320, 340, '200 g chicken breast kcal (≈2 × 165)');
  within(r.protein, 60, 64, '200 g chicken breast protein (≈2 × 31)');
});

test('F1: English quantity — "chicken breast 200g"', () => {
  within(kcal('chicken breast 200g'), 320, 340, 'kcal');
});

test('F1: grams of rice and ml of milk scale linearly', () => {
  within(kcal('150 גרם אורז'), 175, 215, '150 g cooked rice (≈1.5 × 130)');
  within(kcal('250 מ״ל חלב'), 130, 170, '250 ml milk (≈2.5 × 60)');
});

test('F1: a count of eggs is a count — 2 eggs ≠ 3 eggs ≈ n × one egg', () => {
  const one = kcal('ביצה');
  const two = kcal('2 ביצים');
  const three = kcal('3 ביצים');
  assert.ok(one > 0, 'one egg must be recognised');
  assert.ok(three > two, `3 eggs (${three}) must be more than 2 eggs (${two})`);
  within(two, one * 1.8, one * 2.2, '2 eggs ≈ 2 × one egg');
  within(three, one * 2.7, one * 3.3, '3 eggs ≈ 3 × one egg');
});

test('F1: fractions — half an avocado is a quarter of two avocados', () => {
  const half = kcal('חצי אבוקדו');
  const two = kcal('2 אבוקדו');
  assert.ok(half > 0 && two > 0, 'both must be recognised');
  within(two / half, 3.6, 4.4, '"2 אבוקדו" ÷ "חצי אבוקדו" (should be 4)');
});

test('F1: "כף טחינה" is a tablespoon (~15 g), not 100 g', () => {
  const v = kcal('כף טחינה');
  assert.ok(v !== null && v <= 100, `a tablespoon of tahini must be well under a 100 g portion, got ${v}`);
});

// ── F3: every component counts once, with its own quantity ────────────────
test('F3: "2 פרוסות לחם עם גבינה צהובה" is not 100 g bread + 100 g cheese', () => {
  within(kcal('2 פרוסות לחם עם גבינה צהובה'), 150, 350, '2 bread slices + cheese');
});

test('F3: an omelette made of 3 eggs does not count the eggs twice', () => {
  const threeEggs = kcal('3 ביצים');
  const omelette = kcal('חביתה מ-3 ביצים');
  assert.ok(omelette !== null && threeEggs !== null);
  assert.ok(omelette <= threeEggs * 1.35,
    `omelette from 3 eggs (${omelette}) should be about the 3 eggs (${threeEggs}) plus a little oil, not eggs + a second omelette`);
});

// ── F4: wrong matches ─────────────────────────────────────────────────────
test('F4: "דגני בוקר עם חלב" does not contain fish', () => {
  const r = estimateNutrition('דגני בוקר עם חלב');
  assert.ok(!r || !/fish/i.test(r.englishName || ''), `matched: ${r && r.englishName}`);
});

test('F4: plain water is 0 kcal (not "flavored water")', () => {
  const r = estimateNutrition('מים');
  assert.ok(r, 'water must be recognised');
  assert.strictEqual(r.calories, 0);
});

test('F4: plain soda water is not a sorbet', () => {
  const r = estimateNutrition('סודה');
  assert.ok(r, 'soda water must be recognised');
  assert.ok(r.calories <= 5, `got ${r.calories} (${r.englishName})`);
});

test('F4: unsweetened tea and black coffee are ~0 kcal and recognised', () => {
  const tea = estimateNutrition('תה');
  assert.ok(tea, 'tea must be recognised');
  assert.ok(tea.calories <= 5, `tea: ${tea.calories}`);
  const coffee = estimateNutrition('קפה שחור');
  assert.ok(coffee, 'black coffee must be recognised');
  assert.ok(coffee.calories <= 5, `black coffee: ${coffee.calories} (${coffee.englishName})`);
});

test('F4: plural forms are recognised ("2 פיתות" is about two pitas)', () => {
  within(kcal('2 פיתות'), 400, 600, '2 pitas (≈2 × 90 g × 2.75)');
});

test('F4: "שייק חלבון עם חלב" keeps the milk', () => {
  const shake = kcal('שייק חלבון');
  const withMilk = kcal('שייק חלבון עם חלב');
  assert.ok(shake > 0);
  assert.ok(withMilk > shake, `shake + milk (${withMilk}) must be more than the shake alone (${shake})`);
});

test('F4: a non-food word that merely contains a short key is not matched ("חטף" ≠ teff)', () => {
  assert.strictEqual(estimateNutrition('חטף'), null);
});

test('F4 (guard): zero-calorie cola stays zero', () => {
  assert.strictEqual(kcal('קולה זירו'), 0);
});

test('F4 (guard): gibberish is not recognised', () => {
  assert.strictEqual(estimateNutrition('xyz'), null);
  assert.strictEqual(estimateNutrition('לא אכלתי כלום'), null);
});

// ── F4: database integrity ────────────────────────────────────────────────
test('F4: every key is lowercase (the matcher lowercases the input, so an uppercase key can never match)', () => {
  const bad = [];
  for (const it of FOOD_DB) for (const k of it.keys) if (k !== k.toLowerCase()) bad.push(k);
  assert.deepStrictEqual(bad, []);
});

test('F4: no key appears on two different entries', () => {
  const seen = new Map();
  const dup = [];
  FOOD_DB.forEach((it, i) => it.keys.forEach((k) => {
    const kk = k.toLowerCase();
    if (seen.has(kk) && seen.get(kk) !== i) dup.push(k);
    seen.set(kk, i);
  }));
  assert.deepStrictEqual(dup, []);
});

// ── F5: unrecognised input must not become a made-up 350 kcal meal ─────────
// What to do INSTEAD with such a meal is decision 10 (waiting for the product owner);
// meanwhile the safe default is that nothing is made up and nothing is logged.
const { resolveMealEstimate } = require('./mealEstimate');

test('F5: an unrecognised meal gets no numbers — not 350 kcal / 15 P / 40 C / 12 F', () => {
  for (const text of ['xyz', 'לא אכלתי כלום', 'חטף', 'asdfgh']) {
    const r = resolveMealEstimate(text);
    assert.strictEqual(r.estimated, null, text);
    assert.strictEqual(r.reason, 'not-found');
  }
});

test('F5 (guard): a recognised meal and a suggested-menu meal still get their numbers', () => {
  assert.ok(resolveMealEstimate('200 גרם חזה עוף').estimated.calories > 300);
  const fromMenu = resolveMealEstimate('2 ביצים + סלט', { calories: 320, protein: 20, carbs: 15, fat: 18 });
  assert.strictEqual(fromMenu.estimated.calories, 320); // the menu's own totals win over a re-estimate
});

test('F5 (guard): menu totals that are out of range are ignored, not trusted', () => {
  const r = resolveMealEstimate('2 ביצים', { calories: 99999, protein: 20, carbs: 15, fat: 18 });
  assert.strictEqual(r.estimated.calories, 155); // re-estimated from the text instead
});

// ── Task 10 (decision א׳): not found → not saved; the user can type the numbers ──
const { parseNutritionOverride, failureResponse } = require('./mealEstimate');

test('T10: a hand-typed meal for a food the database does not know is accepted as source "manual"', () => {
  const r = resolveMealEstimate('חטיף חלבון של אחותי', { calories: 210, protein: 20, carbs: 18, fat: 7, source: 'manual' });
  assert.deepStrictEqual(
    { c: r.estimated.calories, p: r.estimated.protein, k: r.estimated.carbs, f: r.estimated.fat, s: r.estimated.source },
    { c: 210, p: 20, k: 18, f: 7, s: 'manual' },
  );
});

test('T10: hand-typed numbers that are not usable are refused — they never fall back to guessing the text', () => {
  for (const bad of [
    { calories: 99999, protein: 1, carbs: 1, fat: 1 },
    { calories: -5, protein: 1, carbs: 1, fat: 1 },
    { calories: 'abc', protein: 1, carbs: 1, fat: 1 },
    { calories: '', protein: 1, carbs: 1, fat: 1 },
    { calories: 200, protein: 1, carbs: 1 }, // fat missing
  ]) {
    const r = resolveMealEstimate('2 ביצים', { ...bad, source: 'manual' }); // "2 ביצים" IS in the database: still refused
    assert.strictEqual(r.estimated, null, JSON.stringify(bad));
    assert.strictEqual(r.reason, 'invalid-manual');
  }
});

test('T10: undo of a delete restores the meal exactly — values, fibre, English name and source', () => {
  const o = parseNutritionOverride({ calories: 412, protein: 31, carbs: 40, fat: 12, fiber: 5.26, englishName: 'Chicken and rice', source: 'manual' });
  assert.deepStrictEqual(o, { calories: 412, protein: 31, carbs: 40, fat: 12, fiber: 5.3, source: 'manual', englishName: 'Chicken and rice' });
  // a meal from the menu / the food engine stays "database"; an unknown source is not trusted
  assert.strictEqual(parseNutritionOverride({ calories: 1, protein: 1, carbs: 1, fat: 1 }).source, 'database');
  assert.strictEqual(parseNutritionOverride({ calories: 1, protein: 1, carbs: 1, fat: 1, source: 'hacker' }).source, 'database');
  // the old placeholder can only come back as the exact meal that was deleted
  assert.strictEqual(parseNutritionOverride({ calories: 350, protein: 15, carbs: 40, fat: 12, source: 'default' }).source, 'default');
});

test('T10: the HTTP answers — not found is 422 FOOD_NOT_FOUND, bad hand-typed numbers 400 INVALID_VALUES, both in he + en', () => {
  const nf = failureResponse('not-found');
  assert.strictEqual(nf.status, 422);
  assert.strictEqual(nf.body.code, 'FOOD_NOT_FOUND');
  assert.ok(nf.body.message && nf.body.messageHe);
  const bad = failureResponse('invalid-manual');
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(bad.body.code, 'INVALID_VALUES');
  assert.ok(bad.body.message && bad.body.messageHe);
});

// ── Nutrition audit fixes (approved): tahini + protein powder per 100 g, scoop, reading ──
// Values are USDA FoodData Central SR Legacy per 100 g: tahini 168604 (592 kcal),
// whey-based protein powder 173180 (352 kcal). Both entries used to hold ONE portion.
const { estimator } = require('./calculations');

test('audit: tahini is per 100 g — 50 g is ~296 kcal, a tablespoon (15 g) ~89', () => {
  within(kcal('50 גרם טחינה'), 285, 305, '50 g tahini');
  within(kcal('כף טחינה'), 85, 95, '1 tbsp tahini');
  within(kcal('2 כפות טחינה'), 170, 185, '2 tbsp tahini');
});

test('audit: protein powder is per 100 g — 30 g is ~106 kcal / 23 g protein; a scoop is 30 g', () => {
  const g30 = estimateNutrition('30 גרם אבקת חלבון');
  within(g30.calories, 100, 112, '30 g powder kcal');
  within(g30.protein, 22, 25, '30 g powder protein');
  within(kcal('סקופ אבקת חלבון'), 100, 112, 'one scoop');
  within(kcal('2 סקופ חלבון'), 205, 217, 'two scoops');
  assert.deepStrictEqual(estimator.parse('2 סקופ חלבון').unmatched, [], '"סקופ" is a unit, not an unknown word');
});

test('audit: whey / "חלבון מי גבינה" / "אבקת חלבון" are the same food (no second per-scoop entry)', () => {
  assert.strictEqual(kcal('חלבון מי גבינה'), kcal('אבקת חלבון'));
  assert.strictEqual(kcal('whey'), kcal('protein powder'));
});

test('audit: a scoop of a food that has no scoop weight is not multiplied into grams', () => {
  const r = estimator.parse('2 סקופ אורז').foods[0];
  assert.strictEqual(r.basis, 'count-ignored');
  assert.strictEqual(r.quantityAssumed, true);
});

test('audit: "סנדוויץ׳ טונה" is tuna between bread — two assumed slices are added, once, and only if no bread is named', () => {
  const sandwich = estimator.parse('סנדוויץ׳ טונה');
  assert.deepStrictEqual(sandwich.unmatched, []);
  assert.strictEqual(sandwich.foods.length, 2);
  const bread = sandwich.foods.find((f) => f.entry.keys.includes('לחם'));
  assert.ok(bread && bread.grams === 60 && bread.quantityAssumed, 'two 30 g slices, flagged as assumed');
  assert.ok(kcal('סנדוויץ׳ טונה') > kcal('טונה') + 100, 'the bread counts');
  assert.strictEqual(estimator.parse('סנדוויץ׳ טונה עם לחם מלא').foods.filter((f) => /לחם/.test(f.entry.keys[0])).length, 1, 'a named bread is not doubled');
});

test('audit: "סטייק בקר" and "סטייק הודו" are read as foods; "רזה"/"grilled" are descriptions, not unknown words', () => {
  const beef = estimator.parse('150 גרם סטייק בקר רזה');
  assert.deepStrictEqual(beef.unmatched, []);
  assert.strictEqual(beef.foods.length, 1);
  assert.strictEqual(beef.foods[0].grams, 150);
  assert.ok(kcal('120 גרם סטייק הודו') > 150);
  assert.deepStrictEqual(estimator.parse('grilled chicken breast 200g').unmatched, []);
});

test('audit: oil, tahini, honey with no amount are one tablespoon (flagged as assumed), not 100 g', () => {
  for (const [text, max] of [['שמן זית', 130], ['טחינה', 100], ['דבש', 70], ['חמאת בוטנים', 100], ['מיונז', 100]]) {
    const r = estimateNutrition(text);
    assert.ok(r.calories <= max, text + ': ' + r.calories);
    assert.strictEqual(r.quantityAssumed, true, text);
  }
  assert.strictEqual(kcal('100 גרם שמן זית'), 884); // a written weight is still used as written
});
