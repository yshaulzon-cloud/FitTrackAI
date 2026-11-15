// Menus against the day's target (findings L3, L8, L9): the pick is made on the
// REAL totals and on all four macros, a menu that can't fit says so, a swap never
// pushes the day over the calorie band, and the weekly list sizes each day to its
// own target.
//
// Run: cd server && node --test utils/menus.test.js
const test = require('node:test');
const assert = require('node:assert');
const { mealPlans, getRandomMenu, getWeeklyMenu, swapMeal } = require('../data/mealPlans');

const plans = Object.values(mealPlans).flat();
const sum = (plan, k) => plan.meals.reduce((a, m) => a + m[k], 0);

function withRandom(value, fn) {
  const original = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = original; }
}

test('L9: all four targets count — a menu that matches every target exactly is the first choice', () => {
  for (const plan of plans.filter((_, i) => i % 5 === 0)) {
    const cal = sum(plan, 'calories');
    const pick = withRandom(0, () => getRandomMenu(cal, null, sum(plan, 'protein'), { carbs: sum(plan, 'carbs'), fat: sum(plan, 'fat') }));
    assert.strictEqual(pick.id, plan.id, `target = plan ${plan.id}'s own totals, got plan ${pick.id}`);
  }
});

test('L9: carbs and fat targets steer the choice between menus that are equally close in calories and protein', () => {
  // two menus with similar calories: ask for the fat/carb mix of each and get that one back
  const byCal = [...plans].sort((a, b) => sum(a, 'calories') - sum(b, 'calories'));
  let checked = 0;
  for (let i = 0; i + 1 < byCal.length; i++) {
    const a = byCal[i]; const b = byCal[i + 1];
    if (Math.abs(sum(a, 'calories') - sum(b, 'calories')) > 60) continue;
    for (const want of [a, b]) {
      const pick = withRandom(0, () => getRandomMenu(sum(want, 'calories'), null, sum(want, 'protein'), { carbs: sum(want, 'carbs'), fat: sum(want, 'fat') }));
      assert.strictEqual(pick.id, want.id);
    }
    checked++;
  }
  assert.ok(checked >= 3, `expected several close pairs, found ${checked}`);
});

test('L3/L8: a menu says how far it is from the target (gapKcal) and whether it is only the closest available', () => {
  const fit = getRandomMenu(2000, null, null);
  assert.strictEqual(fit.approximate, false);
  assert.ok(Number.isFinite(fit.gapKcal) && fit.gapKcal <= 200, `gapKcal ${fit.gapKcal}`);
  assert.strictEqual(fit.gapKcal, Math.abs(fit.totalCalories - 2000));

  const far = getRandomMenu(6000, null, null);
  assert.strictEqual(far.approximate, true);
  assert.strictEqual(far.gapKcal, Math.abs(far.totalCalories - 6000));
});

test('L8: the pick is made on the real totals (declared totals can no longer disagree with the meals)', () => {
  for (let target = 1100; target <= 5000; target += 100) {
    const m = getRandomMenu(target, null, null);
    assert.strictEqual(m.totalCalories, sum(m, 'calories'));
    assert.strictEqual(m.totalProtein, sum(m, 'protein'));
    assert.strictEqual(m.totalCarbs, sum(m, 'carbs'));
    assert.strictEqual(m.totalFat, sum(m, 'fat'));
  }
});

test('L1: the weekly menu sizes each day to that day\'s own target', () => {
  const targets = [1900, 2120, 1900, 2120, 1900, 1900, 2120];
  const days = getWeeklyMenu(targets, [150, 150, 150, 150, 150, 150, 150]);
  assert.strictEqual(days.length, 7);
  days.forEach((d, i) => {
    assert.ok(Math.abs(d.totalCalories - targets[i]) <= 200, `day ${i}: ${d.totalCalories} vs ${targets[i]}`);
    assert.strictEqual(d.gapKcal, Math.abs(d.totalCalories - targets[i]));
  });
  // a single number still works for all seven days
  assert.strictEqual(getWeeklyMenu(2000, 150).length, 7);
});

// ── swapping a meal must respect the day's budget ───────────────────────────
const lunches = plans.flatMap((p) => p.meals).filter((m) => m.type === 'lunch');

test('L3: a swap never pushes the day above 110% of the target when a candidate that fits exists', () => {
  for (const cur of lunches.slice(0, 12)) {
    const target = 2000;
    const dayTotal = target * 1.08; // already near the top of the band
    const tolerance = Math.max(50, cur.calories * 0.15);
    const anyFits = lunches.some((m) => m.he !== cur.he && Math.abs(m.calories - cur.calories) <= tolerance && dayTotal - cur.calories + m.calories <= target * 1.1);
    if (!anyFits) continue;
    for (let i = 0; i < 40; i++) {
      const m = swapMeal('lunch', cur.calories, cur.he, { dayTotal, target });
      assert.ok(dayTotal - cur.calories + m.calories <= target * 1.1 + 0.001, `swap of "${cur.he}" (${cur.calories}) → ${m.calories} puts the day at ${dayTotal - cur.calories + m.calories}`);
    }
  }
});

test('L3: a swap in a day that is short of the target leans towards closing the gap', () => {
  const cur = lunches.find((m) => m.calories >= 300);
  const target = 2000;
  const dayTotal = 1500; // 500 short
  const results = Array.from({ length: 60 }, () => swapMeal('lunch', cur.calories, cur.he, { dayTotal, target }));
  const tolerance = Math.max(50, cur.calories * 0.15);
  const pool = lunches.filter((m) => m.he !== cur.he && Math.abs(m.calories - cur.calories) <= tolerance);
  const best = Math.max(...pool.map((m) => m.calories));
  const bestThree = pool.map((m) => m.calories).sort((a, b) => b - a).slice(0, 3);
  assert.ok(results.every((m) => bestThree.includes(m.calories) || m.calories === best), 'only the candidates that bring the day closest to the target are offered');
});

test('L3 (guard): without day context a swap behaves as before (same type, close in calories, not the same text)', () => {
  const cur = lunches[0];
  for (let i = 0; i < 30; i++) {
    const m = swapMeal('lunch', cur.calories, cur.he);
    assert.strictEqual(m.type, 'lunch');
    assert.notStrictEqual(m.he, cur.he);
  }
});

// ── audit: a meal's calories must agree with its own macros ──
test('every menu meal states calories within 10% of 4P + 4C + 9F (five meals were up to 13% off and were corrected from the macros)', () => {
  const off = [];
  for (const plan of plans) for (const m of plan.meals) {
    const atwater = 4 * m.protein + 4 * m.carbs + 9 * m.fat;
    if (Math.abs(atwater - m.calories) / m.calories > 0.1) off.push(plan.id + ': ' + m.he + ' ' + m.calories + ' vs ' + Math.round(atwater));
  }
  assert.deepStrictEqual(off, []);
});
