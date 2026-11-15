// The free-text reader itself (utils/foodText.js + data/portions.js): foods are
// found as whole words with Hebrew prefixes and plural forms, quantities attach to
// the right food, household measures are per food, and what cannot be known is
// flagged instead of invented.
//
// Run: cd server && node --test utils/foodText.test.js
const test = require('node:test');
const assert = require('node:assert');
const { estimator, FOOD_DB, estimateNutrition } = require('./calculations');
const { createEstimator, normalizeText, morphVariants } = require('./foodText');
const portions = require('../data/portions');

const names = (text) => estimator.parse(text).foods.map((f) => f.entry.keys[0]);
const grams = (text) => estimator.parse(text).foods.map((f) => f.grams);

test('every food is found by each of its own names (round trip over the whole database)', () => {
  const missed = [];
  FOOD_DB.forEach((entry, i) => {
    for (const key of entry.keys) {
      const found = estimator.parse(key).foods.map((f) => f.entry);
      if (!found.includes(entry)) missed.push(`#${i} "${key}" → ${found.map((e) => e.keys[0]).join(' + ') || 'nothing'}`);
    }
  });
  assert.deepStrictEqual(missed, []);
});

test('the measures table only names foods that exist (a typo there must not go unnoticed)', () => {
  assert.doesNotThrow(() => createEstimator(FOOD_DB, portions));
  assert.throws(() => createEstimator(FOOD_DB, [{ keys: ['לא קיים במאגר'], unit: 1 }]), /no food named/);
});

test('normalisation: quotes, hyphen before a number, glued units, decimals', () => {
  assert.strictEqual(normalizeText('חביתה מ-3 ביצים'), 'חביתה מ 3 ביצים');
  assert.strictEqual(normalizeText('200g chicken'), '200 g chicken');
  assert.strictEqual(normalizeText('250 מ"ל חלב'), '250 ml חלב');
  assert.strictEqual(normalizeText("קוטג' 5%"), 'קוטג 5%');
  assert.strictEqual(normalizeText('1.5 כוסות'), '1\u00015 כוסות');
});

test('plural and singular reach the same food', () => {
  assert.ok(morphVariants('ביצים').includes('ביצה'));
  assert.ok(morphVariants('פיתות').includes('פיתה'));
  assert.ok(morphVariants('מלפפונים').includes('מלפפון'));
  assert.ok(morphVariants('eggs').includes('egg'));
  for (const [a, b] of [['2 פיתות', 'פיתה'], ['3 תפוחים', 'תפוח'], ['שני מלפפונים', 'מלפפון'], ['eggs', 'egg']]) {
    assert.deepStrictEqual(names(a)[0], names(b)[0], `${a} / ${b}`);
  }
});

test('Hebrew prefixes (the, and, in, to…) do not hide a food', () => {
  assert.deepStrictEqual(names('אורז ועוף'), ['אורז', 'עוף']);
  assert.deepStrictEqual(names('בלחם'), ['לחם']);
  assert.deepStrictEqual(names('עם הביצים'), ['ביצים']);
  assert.deepStrictEqual(names('ושוקולד'), ['שוקולד']);
});

test('whole words only: a food name inside another word is not a match', () => {
  assert.deepStrictEqual(names('דגנים'), []);       // not דג
  assert.deepStrictEqual(names('פולין'), []);       // not פול
  assert.deepStrictEqual(names('מלחמה'), []);       // not לחם / מלח
  assert.deepStrictEqual(names('eggplant'), ['חציל']); // eggplant is not egg
  assert.strictEqual(estimateNutrition('חטף'), null);
});

test('the longest food name wins, and neighbouring foods are all kept', () => {
  assert.deepStrictEqual(names('חזה עוף'), ['חזה עוף']);     // not "עוף"
  assert.deepStrictEqual(names('שייק חלבון עם חלב'), ['שייק חלבון', 'חלב']);
  assert.deepStrictEqual(names('חזה עוף ואורז וסלט'), ['חזה עוף', 'אורז', 'סלט']);
});

test('a quantity can come before or after its food', () => {
  assert.deepStrictEqual(grams('150 גרם אורז'), [150]);
  assert.deepStrictEqual(grams('אורז 150 גרם'), [150]);
  assert.deepStrictEqual(grams('חלב 250 מל'), [250]);
  assert.deepStrictEqual(grams('250 מ"ל חלב'), [250]);
  assert.deepStrictEqual(grams('chicken breast 200g'), [200]);
});

test('each quantity goes to the food next to it, once', () => {
  assert.deepStrictEqual(grams('150 גרם אורז + 200 גרם חזה עוף'), [150, 200]);
  assert.deepStrictEqual(grams('אורז 150 גרם עוף 200 גרם'), [150, 200]);
  assert.deepStrictEqual(grams('3 ביצים ו-2 פרוסות לחם'), [150, 60]);
});

test('household measures are per food', () => {
  assert.deepStrictEqual(grams('2 כפות שמן זית'), [27]);   // 13.5 g each
  assert.deepStrictEqual(grams('כפית דבש'), [7]);
  assert.deepStrictEqual(grams('כוס חלב'), [244]);
  assert.deepStrictEqual(grams('כוס אורז'), [158]);        // a cup of rice is not a cup of milk
  assert.deepStrictEqual(grams('1 וחצי כוסות חלב'), [366]);
  assert.deepStrictEqual(grams('1.5 כוסות חלב'), [366]);
  assert.deepStrictEqual(grams('חצי פיתה'), [45]);
});

test('"כוס וחצי" is a cup and a half, and "וחצי" is not left over as an unknown word', () => {
  assert.deepStrictEqual(grams('כוס וחצי חלב'), [366]);
  assert.deepStrictEqual(grams('אורז (כוס וחצי)'), [237]);   // 1.5 × 158
  assert.deepStrictEqual(grams('כף וחצי טחינה'), grams('1.5 כפות טחינה'));
  assert.deepStrictEqual(estimator.parse('אורז (כוס וחצי)').unmatched, []);
  assert.deepStrictEqual(grams('כוס חלב'), [244]); // a plain cup is still one
});

test('no quantity written: the food\'s usual serving, flagged — or 100 g, flagged', () => {
  const egg = estimator.parse('ביצה').foods[0];
  assert.strictEqual(egg.grams, 50);
  assert.strictEqual(egg.quantityAssumed, true);
  assert.strictEqual(egg.basis, 'serving');
  const steak = estimator.parse('סטייק').foods[0];
  assert.strictEqual(steak.grams, 100);
  assert.strictEqual(steak.quantityAssumed, true);
  assert.strictEqual(steak.basis, 'default');
  assert.strictEqual(estimateNutrition('סטייק').quantityAssumed, true);
});

test('a written weight is never flagged; neither is a counted piece with a known weight', () => {
  assert.strictEqual(estimator.parse('200 גרם סטייק').foods[0].quantityAssumed, false);
  assert.strictEqual(estimator.parse('3 ביצים').foods[0].quantityAssumed, false);
});

test('a bare number the food cannot use (a fat percentage typed without %) is not multiplied into grams', () => {
  const r = estimator.parse('קוטג 5').foods[0];
  assert.strictEqual(r.basis, 'count-ignored');
  assert.strictEqual(r.grams, 100);
  assert.strictEqual(r.quantityAssumed, true);
  assert.strictEqual(estimator.parse('קוטג 5%').foods[0].grams, 100);
});

test('"3 ביצים" and "ביצה" are the same food on the same basis', () => {
  assert.strictEqual(estimateNutrition('ביצה').calories, 78);       // the old per-egg figure, unchanged
  assert.strictEqual(estimateNutrition('3 ביצים').calories, 233);
});

test('an omelette made of N eggs is counted as the eggs, not the dish and the eggs', () => {
  assert.deepStrictEqual(names('חביתה מ-3 ביצים'), ['ביצים']);
  assert.deepStrictEqual(names('חביתה'), ['חביתה']);
});

test('a one-letter typo in a long word is caught only when it is unambiguous', () => {
  assert.deepStrictEqual(names('מלפפונ'), ['מלפפון']);
  assert.deepStrictEqual(names('בטטא'), []);   // too short to guess
  assert.deepStrictEqual(names('זזזזזזז'), []);
});

test('words that were not understood are reported, not silently dropped', () => {
  const r = estimateNutrition('דגני בוקר עם חלב');
  assert.deepStrictEqual(r.unmatched, ['דגני', 'בוקר']);
  assert.strictEqual(estimateNutrition('2 ביצים קשות').unmatched.length, 0);
});

test('totals add the foods up once, each with its own amount', () => {
  const r = estimateNutrition('150 גרם חזה עוף + 150 גרם אורז');
  assert.strictEqual(r.calories, Math.round(1.5 * 165 + 1.5 * 130));
  assert.strictEqual(r.items.length, 2);
  assert.strictEqual(r.items[0].grams, 150);
});
