// Rules every FOOD_DB entry added in the Nov 2026 nutrition round has to keep, plus the checks that
// hold for the whole database. (The values themselves are guarded by usdaCheck.test.js, which compares
// each verified entry with its USDA record.)
//
// Run: cd server && node --test utils/foodDb.test.js
const test = require('node:test');
const assert = require('node:assert');
const { FOOD_DB, estimator } = require('./calculations');
const portions = require('../data/portions');
const usda = require('../scripts/usda-verified.json');

// First Hebrew key of each entry added in the round. Every one of them is copied from ONE USDA SR Legacy
// record (usda-verified.json), so "has a source" is a test, not a promise.
const ADDED = [
  'סוכר חום', 'סירופ מייפל', 'קקאו', 'שמן קנולה', 'שמן חמניות', 'שמן שומשום', 'צימוקים', 'בוטנים', 'אגוזי לוז',
  'שומשום', 'קוקוס מגורד', 'שמנת מתוקה', 'גבינת עיזים', 'מיץ תפוחים', 'מיץ ענבים', 'מיץ גזר', 'מיץ עגבניות',
  'מיץ לימון', 'מיץ אננס', 'רסק עגבניות', 'רוטב עגבניות', 'רוטב ברביקיו', 'חומץ',
  'סוכר', 'קמח', // added once the engine understood negation ("בלי סוכר")
];
const entryOf = (key) => FOOD_DB.find((e) => e.keys.includes(key));

// The same normalisation the engine uses for a key, so "ג'ינג'ר" and "גינגר" count as one name.
const norm = (k) => estimator.tokenize(k).join(' ');

test('every added food has a USDA record, and the DB values equal it (within the audit tolerance)', () => {
  for (const key of ADDED) {
    const e = entryOf(key);
    assert.ok(e, `no FOOD_DB entry for "${key}"`);
    const rec = usda.records.find((r) => r.key === key);
    assert.ok(rec, `"${key}" has no USDA record in usda-verified.json (a food without a source is not added)`);
    assert.ok(Number.isInteger(rec.fdc) && rec.fdc > 0, `"${key}" has no FDC id`);
  }
});

test('every added food: Hebrew and English keys, per-100 g numbers that make sense', () => {
  for (const key of ADDED) {
    const e = entryOf(key);
    assert.ok(e.keys.some((k) => /[א-ת]/.test(k)), `${key}: no Hebrew key`);
    assert.ok(e.keys.some((k) => /^[a-z ]+$/i.test(k)), `${key}: no English key`);
    for (const f of ['cal', 'p', 'c', 'f', 'fb']) assert.ok(Number.isFinite(e[f]) && e[f] >= 0, `${key}: bad ${f}`);
    assert.ok(e.fb <= e.c, `${key}: fibre ${e.fb} is more than carbohydrate ${e.c} (impossible)`);
    assert.ok(e.p + e.c + e.f <= 100.01, `${key}: macros add up to more than 100 g per 100 g`);
  }
});

test('every added food: calories agree with 4P + 4C + 9F (same tolerance as the audit: 25% and 25 kcal, fibre at 2 kcal/g allowed)', () => {
  const off = (cal, est) => cal > 0 && Math.abs(est - cal) / cal > 0.25 && Math.abs(est - cal) > 25;
  // The USDA record itself is far from 4/4/9 for these (USDA uses food-specific energy factors and the
  // macros of cocoa include 37 g of fibre). The DB value IS the USDA value, so it stays; same exception
  // the audit makes for wheat bran and spirulina.
  const USDA_OWN_KCAL = ['קקאו'];
  for (const key of USDA_OWN_KCAL) {
    assert.strictEqual(entryOf(key).cal, usda.records.find((r) => r.key === key).cal, `${key}: the exception only holds while the value is the USDA one`);
  }
  const bad = ADDED.filter((key) => !USDA_OWN_KCAL.includes(key)).filter((key) => {
    const e = entryOf(key);
    const plain = 4 * e.p + 4 * e.c + 9 * e.f;
    const withFibre = 4 * e.p + 4 * Math.max(0, e.c - e.fb) + 2 * e.fb + 9 * e.f;
    return off(e.cal, plain) && off(e.cal, withFibre);
  });
  assert.deepStrictEqual(bad, []);
});

test('no key is used by two entries (normalised the way the engine reads them)', () => {
  const seen = new Map();
  const dup = [];
  FOOD_DB.forEach((e, i) => e.keys.forEach((k) => {
    const n = norm(k);
    if (seen.has(n) && seen.get(n) !== i) dup.push(`"${k}" (${FOOD_DB[seen.get(n)].keys[0]} / ${e.keys[0]})`);
    seen.set(n, i);
  }));
  assert.deepStrictEqual(dup, []);
});

test('no added key is shadowed: reading the key itself returns that very entry', () => {
  const shadowed = [];
  for (const key of ADDED) {
    const e = entryOf(key);
    for (const k of e.keys) {
      const { foods } = estimator.parse(k);
      const got = foods.length === 1 ? foods[0].entry : null;
      if (got !== e) shadowed.push(`"${k}" of ${key} reads as ${got ? got.keys[0] : 'nothing / several foods'}`);
    }
  }
  assert.deepStrictEqual(shadowed, []);
});

test('the added foods are recognised in a sentence, with a sensible amount', () => {
  const kcal = (t) => estimator.estimate(t)?.calories;
  assert.ok(Math.abs(kcal('כוס מיץ תפוחים') - 114) <= 2, 'a cup of apple juice is ~114 kcal (it used to be read as an apple, 94)');
  assert.ok(Math.abs(kcal('כף שמן קנולה') - 124) <= 2);
  assert.ok(Math.abs(kcal('כף שומשום') - 52) <= 2);
  assert.ok(kcal('רוטב פסטה') < 100, 'pasta sauce is no longer read as 100 g of pasta (158 kcal)');
  assert.ok(Math.abs(kcal('סירופ מייפל') - 52) <= 2, 'a spoon of maple syrup (20 g)');
});

test('a food that is still unknown is still unknown (nothing guessed from a similar spelling)', () => {
  assert.strictEqual(estimator.estimate('גיינר'), null);
  assert.strictEqual(estimator.estimate('צלעות חזיר בקראמל'), null);
});

test('plain sugar and flour are foods now, with USDA household measures', () => {
  const kcal = (t) => estimator.estimate(t)?.calories;
  assert.strictEqual(kcal('כפית סוכר'), 16, 'one teaspoon of sugar = 4.2 g = 16 kcal');
  assert.strictEqual(kcal('2 כפיות סוכר'), 33);
  assert.strictEqual(kcal('כוס קמח'), 455, 'one cup of flour = 125 g = 455 kcal');
  assert.strictEqual(kcal('100 גרם קמח'), 364);
  assert.strictEqual(entryOf('סוכר חום').keys[0], 'סוכר חום', 'brown sugar stays its own food');
  assert.ok(Math.abs(kcal('כפית סוכר חום') - 17) <= 1, '"סוכר חום" is read as brown sugar, not sugar + an unknown word');
});

test('negation: a food after "בלי / ללא / without / no" is not counted', () => {
  const names = (t) => (estimator.estimate(t)?.items || []).map((i) => i.nameHe);
  assert.deepStrictEqual(names('קפה בלי סוכר'), ['קפה שחור']);
  assert.deepStrictEqual(names('קפה ללא סוכר'), ['קפה שחור']);
  assert.deepStrictEqual(names('תה עם לימון בלי סוכר'), ['תה', 'לימון']);
  assert.deepStrictEqual(names('coffee without sugar'), ['קפה שחור']);
  assert.deepStrictEqual(names('tea with no sugar'), ['תה']);
  assert.deepStrictEqual(names('עוגה ללא קמח'), names('עוגה'), 'a flourless cake does not add flour');
  // the negation covers a list joined by "ו" / "או" / "and" / "or" …
  assert.deepStrictEqual(names('קפה בלי חלב וסוכר'), ['קפה שחור']);
  assert.deepStrictEqual(names('קפה בלי חלב או סוכר'), ['קפה שחור']);
  assert.deepStrictEqual(names('coffee without milk or sugar'), ['קפה שחור']);
  // … and stops at the next other word
  assert.deepStrictEqual(names('קפה בלי סוכר עם חלב'), ['קפה שחור', 'חלב']);
  assert.deepStrictEqual(names('קפה ובלי סוכר'), ['קפה שחור']);
});

test('negation: what was left out is reported, never counted, never "not understood"', () => {
  const r = estimator.parse('קפה בלי סוכר');
  assert.deepStrictEqual(r.without, ['סוכר']);
  assert.deepStrictEqual(r.unmatched, []);
  const e = estimator.estimate('קפה בלי סוכר');
  assert.ok(e.calories <= 2, 'black coffee only');
  assert.strictEqual(estimator.estimate('בלי סוכר'), null, 'nothing left to count is "not recognised", not a meal of sugar');
});

test('negation does not swallow a food that merely contains a negator word, nor does any food name start with one', () => {
  for (const e of FOOD_DB) for (const k of e.keys) {
    const first = estimator.tokenize(k)[0];
    assert.ok(!['בלי', 'ללא', 'ובלי', 'וללא', 'without', 'no'].includes(first), `"${k}" starts with a negation word and could never be read`);
  }
});

test('every household-measure row names a food that exists, and the added foods that have measures keep their USDA basis', () => {
  for (const p of portions) for (const k of p.keys) assert.ok(entryOf(k) || FOOD_DB.some((e) => e.keys.includes(k)), `portions: "${k}" is not in FOOD_DB`);
  for (const key of ADDED) {
    const spec = portions.find((p) => p.keys.includes(key));
    if (spec) assert.strictEqual(spec.basis, 'usda', `${key}: a measure for an added food must come from USDA`);
  }
});
