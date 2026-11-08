const test = require('node:test');
const assert = require('node:assert');
const { trainingWeekdays, weekdayInTz, calorieShifts, dayTypeFor } = require('./dayType');

test('every schedule has the right number of distinct weekdays', () => {
  for (let n = 1; n <= 7; n++) {
    const d = trainingWeekdays(n);
    assert.strictEqual(d.length, n);
    assert.strictEqual(new Set(d).size, n);
  }
  assert.deepStrictEqual(trainingWeekdays(0), []);
  assert.deepStrictEqual(trainingWeekdays(undefined), []);
  assert.strictEqual(trainingWeekdays(12).length, 7);
});

test('the weekly average calories equal the plain target for every workouts-per-week value', () => {
  for (let n = 1; n <= 7; n++) {
    const days = trainingWeekdays(n);
    const profile = { workoutsPerWeek: n, timezone: 'Asia/Jerusalem' };
    let sum = 0;
    // 2026-11-01 is a Sunday
    for (let i = 0; i < 7; i++) {
      const now = new Date(Date.UTC(2026, 10, 1 + i, 9, 0, 0));
      sum += dayTypeFor({ profile, baseCalories: 2000, now }).calories;
      assert.strictEqual(weekdayInTz('Asia/Jerusalem', now), i);
    }
    assert.ok(Math.abs(sum - 14000) <= 7, `n=${n}: weekly sum ${sum}`);
    assert.ok(days.length === n);
  }
});

test('shifts are capped: training bonus ≤ 6 %, rest cut ≤ 15 %', () => {
  for (let n = 1; n <= 7; n++) {
    const { gain, drop } = calorieShifts(n);
    assert.ok(gain <= 0.0600001 && drop <= 0.1500001, `n=${n}`);
  }
  assert.deepStrictEqual(calorieShifts(7), { gain: 0, drop: 0 });
  assert.deepStrictEqual(calorieShifts(0), { gain: 0, drop: 0 });
});

test('a training day is higher than a rest day', () => {
  const profile = { workoutsPerWeek: 3, timezone: 'Asia/Jerusalem' };
  const sun = dayTypeFor({ profile, baseCalories: 2000, now: new Date('2026-11-01T09:00:00Z') }); // Sunday: scheduled
  const mon = dayTypeFor({ profile, baseCalories: 2000, now: new Date('2026-11-02T09:00:00Z') }); // Monday: rest
  assert.strictEqual(sun.type, 'training');
  assert.strictEqual(mon.type, 'rest');
  assert.ok(sun.calories > 2000 && mon.calories < 2000);
  assert.ok(sun.deltaPct > 0 && mon.deltaPct < 0);
});

test('training on a scheduled rest day turns it into a training day', () => {
  const profile = { workoutsPerWeek: 3, timezone: 'Asia/Jerusalem' };
  const mon = dayTypeFor({ profile, baseCalories: 2000, workedOutToday: true, now: new Date('2026-11-02T09:00:00Z') });
  assert.strictEqual(mon.type, 'training');
  assert.strictEqual(mon.scheduled, false);
});

test('the weekday follows the user timezone, not UTC', () => {
  // 22:30 UTC Saturday is already Sunday 00:30 in Israel
  const t = new Date('2026-11-07T22:30:00Z');
  assert.strictEqual(weekdayInTz('Asia/Jerusalem', t), 0);
  assert.strictEqual(weekdayInTz('UTC', t), 6);
});

test('no workouts planned → no adjustment', () => {
  const r = dayTypeFor({ profile: { workoutsPerWeek: 0 }, baseCalories: 2000, now: new Date('2026-11-02T09:00:00Z') });
  assert.strictEqual(r.calories, 2000);
  assert.strictEqual(r.type, 'rest');
});
