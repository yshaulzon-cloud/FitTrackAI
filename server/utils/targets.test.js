// Regression tests for how the daily calorie target relates to menus (findings
// L2, L8, F7). They describe the behaviour we WANT; several fail on purpose
// until the fixes land.
//
// Run: cd server && node --test utils/targets.test.js
const test = require('node:test');
const assert = require('node:assert');
const { dayTypeFor } = require('./dayType');
const { getDailyTargets, weeklyTargetsForUser } = require('./targets');
const { mealPlans, getRandomMenu } = require('../data/mealPlans');

const plans = Object.values(mealPlans).flat();
const sum = (plan, key) => plan.meals.reduce((a, m) => a + m[key], 0);

// ── L1 / L2: one target per day, shared by the menu, the ring and XP ───────
// Decision 2 = option A: the target is the day's own (training / rest) number
// everywhere. getDailyTargets() is the single source (utils/targets.js); the menu
// is sized to today.calories and checkNutritionGoals / the ring compare to the
// same number, so eating exactly the day's menu is always 100% of the target.
const PROFILE = { weight: 80, height: 180, age: 30, gender: 'male', goal: 'maintain', experience: 'intermediate', timezone: 'Asia/Jerusalem' };
const SUNDAY = (offset = 0) => new Date(Date.UTC(2026, 10, 1 + offset, 9, 0, 0)); // 2026-11-01 is a Sunday

test('L2: the number the daily menu is sized to is the number XP and the ring use, for every workouts/week and weekday', () => {
  const failures = [];
  for (let n = 1; n <= 7; n++) {
    for (let d = 0; d < 7; d++) {
      const profile = { ...PROFILE, workoutsPerWeek: n };
      const t = getDailyTargets({ profile, now: SUNDAY(d) });
      const menuSizedTo = dayTypeFor({ profile, baseCalories: t.base.calories, now: SUNDAY(d) }).calories;
      const ratio = menuSizedTo / t.today.calories; // XP / ring denominator
      if (menuSizedTo !== t.today.calories || ratio < 0.9 || ratio > 1.1) {
        failures.push(`${n}/week, weekday ${d} (${t.dayType.type}): menu ${menuSizedTo} vs target ${t.today.calories}`);
      }
    }
  }
  assert.deepStrictEqual(failures, []);
});

test('L1: base is the plain target; today shifts only by the day type', () => {
  for (const n of [3, 5, 7]) {
    const profile = { ...PROFILE, workoutsPerWeek: n };
    const outcomes = [0, 1, 2, 3, 4, 5, 6].map((d) => getDailyTargets({ profile, now: SUNDAY(d) }));
    const base = outcomes[0].base.calories;
    for (const o of outcomes) {
      assert.strictEqual(o.base.calories, base, `${n}/week: base must not depend on the day`);
      assert.ok(o.today.calories >= Math.round(base * 0.85) - 1 && o.today.calories <= Math.round(base * 1.06) + 1, `${n}/week: ${o.today.calories} vs base ${base}`);
    }
    // training days are above base, rest days below, a full-week plan has no shift
    if (n === 7) assert.ok(outcomes.every((o) => o.today.calories === base));
    else {
      assert.ok(outcomes.some((o) => o.dayType.type === 'training' && o.today.calories > base));
      assert.ok(outcomes.some((o) => o.dayType.type === 'rest' && o.today.calories < base));
    }
  }
});

test('L1: the weekly average of today\'s calories (and carbs) equals the base — 3, 5 and 7 workouts/week', () => {
  for (const n of [3, 5, 7]) {
    const profile = { ...PROFILE, workoutsPerWeek: n };
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => getDailyTargets({ profile, now: SUNDAY(d) }));
    const base = week[0].base;
    const avgCal = week.reduce((a, o) => a + o.today.calories, 0) / 7;
    const avgCarbs = week.reduce((a, o) => a + o.today.carbs, 0) / 7;
    assert.ok(Math.abs(avgCal - base.calories) <= 1, `${n}/week: average ${avgCal} vs ${base.calories}`);
    assert.ok(Math.abs(avgCarbs - base.macros.carbs) <= 1.5, `${n}/week: carbs average ${avgCarbs} vs ${base.macros.carbs}`);
  }
});

test('L1: on a shifted day protein and fat keep their grams, carbs absorb the difference, and the macros still add up to the calories', () => {
  for (const n of [3, 5]) {
    const profile = { ...PROFILE, workoutsPerWeek: n };
    for (let d = 0; d < 7; d++) {
      const o = getDailyTargets({ profile, now: SUNDAY(d) });
      assert.strictEqual(o.today.protein, o.base.macros.protein);
      assert.strictEqual(o.today.fat, o.base.macros.fat);
      const fromMacros = 4 * o.today.protein + 4 * o.today.carbs + 9 * o.today.fat;
      assert.ok(Math.abs(fromMacros - o.today.calories) <= 12, `${n}/week day ${d}: macros give ${fromMacros}, target ${o.today.calories}`);
    }
  }
});

test('L1: a workout already logged today turns a rest day into a training day', () => {
  const profile = { ...PROFILE, workoutsPerWeek: 3 }; // schedule: Sun, Tue, Thu — Monday is a rest day
  const monday = SUNDAY(1);
  const rest = getDailyTargets({ profile, workedOutToday: false, now: monday });
  const trained = getDailyTargets({ profile, workedOutToday: true, now: monday });
  assert.strictEqual(rest.dayType.type, 'rest');
  assert.strictEqual(trained.dayType.type, 'training');
  assert.ok(trained.today.calories > rest.today.calories);
  assert.strictEqual(trained.base.calories, rest.base.calories);
});

test('L1: the weekly list gives each calendar day its own target (day i = today + i), day 0 honouring a workout already logged', async () => {
  const Workout = require('../models/Workout');
  const original = Workout.exists;
  try {
    const user = { _id: 'u1', profile: { ...PROFILE, workoutsPerWeek: 3 } };
    const monday = SUNDAY(1); // rest day on the 3/week schedule (Sun, Tue, Thu)
    Workout.exists = async () => false;
    const quiet = await weeklyTargetsForUser(user, 7, monday);
    assert.deepStrictEqual(quiet.map((w) => w.dayType.type), ['rest', 'training', 'rest', 'training', 'rest', 'rest', 'training']); // Mon..Sun
    Workout.exists = async () => true;
    const trained = await weeklyTargetsForUser(user, 7, monday);
    assert.strictEqual(trained[0].dayType.type, 'training'); // today, already trained
    assert.strictEqual(trained[1].dayType.type, 'training'); // Tue — still by schedule
    assert.strictEqual(trained[2].dayType.type, 'rest');     // Wed — a past/other workout does not leak into later days
  } finally {
    Workout.exists = original;
  }
});

test('L1 (guard): no route recomputes a calorie target on its own — everything goes through utils/targets.js', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const offenders = [];
  for (const rel of ['../routes/nutrition.js', '../routes/user.js', './targetChange.js']) {
    const src = fs.readFileSync(path.join(__dirname, rel), 'utf8');
    if (/calculateCalorieTarget|calculateMacros\(/.test(src)) offenders.push(rel);
  }
  assert.deepStrictEqual(offenders, []);
});

// ── F7: declared menu totals must equal the sum of their meals ────────────
for (const [declared, mealKey, tolerance, label] of [
  ['totalCalories', 'calories', 5, 'kcal'],
  ['totalProtein', 'protein', 3, 'protein g'],
  ['totalCarbs', 'carbs', 3, 'carbs g'],
  ['totalFat', 'fat', 3, 'fat g'],
]) {
  test(`F7: every menu's ${declared} matches the sum of its meals (±${tolerance} ${label})`, () => {
    const bad = plans
      .filter((p) => Math.abs(sum(p, mealKey) - p[declared]) > tolerance)
      .map((p) => `plan ${p.id}: declared ${p[declared]}, meals add up to ${sum(p, mealKey)}`);
    assert.deepStrictEqual(bad, [], `${bad.length} of ${plans.length} menus are off`);
  });
}

// ── L8: the menu chosen for a target is close to it in REAL calories ──────
test('L8: when some menu really fits the target, the picked menu\'s meals add up to within ±200 kcal of it', () => {
  const bad = [];
  for (let target = 1100; target <= 5000; target += 50) {
    const fitting = plans.some((p) => Math.abs(sum(p, 'calories') - target) <= 200);
    if (!fitting) continue;
    for (let i = 0; i < 30; i++) {
      const m = getRandomMenu(target, null, null);
      const real = sum(m, 'calories');
      if (Math.abs(real - target) > 200) { bad.push(`target ${target}: plan ${m.id} adds up to ${real}`); break; }
    }
  }
  assert.deepStrictEqual(bad.slice(0, 10), [], `${bad.length} targets got a menu outside the window`);
});

test('L8: with no menu near the target the result says so (approximate + gap), never silently', () => {
  const m = getRandomMenu(6000, null, null);
  assert.ok(m, 'a menu is still returned');
  assert.strictEqual(m.approximate, true);
  assert.ok(Number.isFinite(m.gapKcal) && m.gapKcal > 200, `gapKcal: ${m.gapKcal}`);
});
