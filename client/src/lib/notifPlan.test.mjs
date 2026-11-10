// Run with:  node --test src/lib/notifPlan.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readPrefs, writeEnabled, writeTime, writeMaster, writeCategory, writeWeekday, isActive, isQuietTime, getCopy, NOTIF_TYPES, USER_TYPES, COPY } from './notifConfig.mjs';
import { buildPlan, idFor, epochDay, eatenSlots, slotOfHour, isManagedId, LEGACY_IDS } from './notifPlan.mjs';

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
// Wednesday 2026-11-04, 07:50 local
const NOW = new Date(2026, 10, 4, 7, 50, 0, 0);
const plan = (storage, state = {}, now = NOW) => buildPlan({ now, prefs: readPrefs(storage), state, isHe: true });
const of = (p, type) => p.filter((n) => n.type === type);
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

test('defaults: meals/workout/streak/sleep on, weekly off', () => {
  const p = readPrefs(mem());
  assert.equal(p.master, true);
  assert.equal(p.items.workout.enabled, true);
  assert.equal(p.items.weekly.enabled, false);
  assert.deepEqual(p.items.meal_morning.time, { hour: 8, minute: 0 });
  assert.equal(p.items.sleep_prompt.enabled, true);
});

test('legacy combined "notif:meal" seeds the three meal reminders', () => {
  const p = readPrefs(mem({ 'notif:meal': '0' }));
  assert.equal(p.items.meal_morning.enabled, false);
  assert.equal(p.items.meal_evening.enabled, false);
  assert.equal(p.items.workout.enabled, true);
  // an explicit per-meal value wins over the legacy one
  assert.equal(readPrefs(mem({ 'notif:meal': '0', 'notif:meal_evening': '1' })).items.meal_evening.enabled, true);
});

test('breakfast eaten at 07:50 → no 08:00 reminder today, but tomorrow is still there', () => {
  const p = plan(mem(), { eatenSlots: new Set(['breakfast']) });
  const b = of(p, 'meal_morning');
  assert.equal(b.length, 6); // days 1..6 of the 7-day window
  assert.ok(b.every((n) => n.at.getDate() !== 4));
  assert.equal(b[0].at.getDate(), 5);
  assert.equal(hhmm(b[0].at), '08:00');
});

test('un-ticking at 07:55 brings today back', () => {
  const now = new Date(2026, 10, 4, 7, 55);
  const p = plan(mem(), { eatenSlots: new Set() }, now);
  const b = of(p, 'meal_morning');
  assert.equal(b.length, 7);
  assert.equal(b[0].at.getDate(), 4);
});

test('a slot only suppresses its own meal', () => {
  const p = plan(mem(), { eatenSlots: new Set(['breakfast']) });
  assert.equal(of(p, 'meal_afternoon')[0].at.getDate(), 4);
  assert.equal(of(p, 'meal_evening')[0].at.getDate(), 4);
});

test('past times today are not scheduled', () => {
  const now = new Date(2026, 10, 4, 14, 0);
  const p = plan(mem(), {}, now);
  assert.equal(of(p, 'meal_morning')[0].at.getDate(), 5);
  assert.equal(of(p, 'meal_afternoon')[0].at.getDate(), 5);
  assert.equal(of(p, 'meal_evening')[0].at.getDate(), 4);
});

test('ids are stable per (type, date) and unique', () => {
  const p = plan(mem());
  const ids = p.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  const lunchToday = of(p, 'meal_afternoon')[0];
  assert.equal(lunchToday.id, idFor(NOTIF_TYPES.meal_afternoon.baseId, new Date(2026, 10, 4, 13, 0)));
  assert.ok(ids.every((id) => id < 2 ** 31 && isManagedId(id)));
  // the same date later in the day gives the same id (so it can be cancelled)
  assert.equal(idFor(1002, new Date(2026, 10, 4, 1, 0)), idFor(1002, new Date(2026, 10, 4, 23, 59)));
  assert.notEqual(idFor(1002, new Date(2026, 10, 4)), idFor(1003, new Date(2026, 10, 4)));
});

test('legacy repeating ids (1001–1008) are not "managed" ids', () => {
  for (const id of LEGACY_IDS) assert.equal(isManagedId(id), false);
});

test('epochDay is local-calendar based', () => {
  assert.equal(epochDay(new Date(2026, 10, 4, 0, 5)), epochDay(new Date(2026, 10, 4, 23, 55)));
  assert.equal(epochDay(new Date(2026, 10, 5)) - epochDay(new Date(2026, 10, 4)), 1);
});

test('workout: weekly goal met → no workout reminders at all', () => {
  assert.equal(of(plan(mem(), { weeklyGoalMet: true }), 'workout').length, 0);
});

test('workout: trained today or rest day → skip only today', () => {
  const trained = of(plan(mem(), { workedOutToday: true }), 'workout');
  assert.equal(trained.length, 6);
  assert.equal(trained[0].at.getDate(), 5);
  const rest = of(plan(mem(), { restDayToday: true }), 'workout');
  assert.equal(rest[0].at.getDate(), 5);
});

test('streak: activity already done today → skip today only', () => {
  const s = of(plan(mem(), { activityDoneToday: true }), 'streak');
  assert.equal(s[0].at.getDate(), 5);
  assert.equal(of(plan(mem()), 'streak')[0].at.getDate(), 4);
});

test('custom time is honoured', () => {
  const st = mem(); writeTime(st, 'meal_evening', '20:15');
  assert.equal(hhmm(of(plan(st), 'meal_evening')[0].at), '20:15');
});

test('turning a reminder off removes it', () => {
  const st = mem(); writeEnabled(st, 'meal_morning', false);
  assert.equal(of(plan(st), 'meal_morning').length, 0);
});

test('master switch off → nothing; category off → only that category', () => {
  const st = mem(); writeMaster(st, false);
  assert.equal(plan(st).length, 0);
  const st2 = mem(); writeCategory(st2, 'nutrition', false);
  const p = plan(st2);
  assert.equal(p.filter((n) => n.category === 'nutrition').length, 0);
  assert.ok(of(p, 'workout').length > 0);
  assert.equal(isActive(readPrefs(st2), 'meal_morning'), false);
  assert.equal(isActive(readPrefs(st2), 'workout'), true);
});

test('weekly recap: on the chosen weekday, 2 upcoming', () => {
  const st = mem(); writeEnabled(st, 'weekly', true); writeWeekday(st, 'weekly', 5); // Friday
  const w = of(plan(st), 'weekly');
  assert.equal(w.length, 2);
  assert.ok(w.every((n) => n.at.getDay() === 5));
  assert.equal(w[0].at.getDate(), 6);
  assert.equal(hhmm(w[0].at), '10:00');
});

test('sleep: prompt at the chosen time + follow-up 2h later, today dropped once logged', () => {
  const st = mem(); writeTime(st, 'sleep_prompt', '09:30');
  const now = new Date(2026, 10, 4, 6, 0);
  const p = plan(st, {}, now);
  const prompt = of(p, 'sleep_prompt'), follow = of(p, 'sleep_followup');
  assert.equal(hhmm(prompt[0].at), '09:30');
  assert.equal(hhmm(follow[0].at), '11:30');
  assert.equal(prompt[0].at.getDate(), 4);
  const logged = plan(st, { sleepLoggedToday: true }, now);
  assert.equal(of(logged, 'sleep_prompt')[0].at.getDate(), 5);
  assert.equal(of(logged, 'sleep_followup')[0].at.getDate(), 5);
});

test('plan is sorted by time and uses the language asked for', () => {
  const p = plan(mem());
  for (let i = 1; i < p.length; i++) assert.ok(p[i].at >= p[i - 1].at);
  const en = buildPlan({ now: NOW, prefs: readPrefs(mem()), state: {}, isHe: false });
  assert.equal(en.find((n) => n.type === 'workout').title, 'Time to train 💪');
});

test('eatenSlots: menu ticks and manually logged meals both count', () => {
  const menuMeals = [{ type: 'breakfast' }, { type: 'snack' }, { type: 'lunch' }];
  assert.deepEqual([...eatenSlots({ menuMeals, menuTicked: [0] })], ['breakfast']);
  assert.deepEqual([...eatenSlots({ menuMeals, menuTicked: [1] })], []); // snacks have no reminder
  const logged = [{ time: new Date(2026, 10, 4, 7, 20).toISOString() }, { time: new Date(2026, 10, 4, 13, 5).toISOString() }];
  assert.deepEqual([...eatenSlots({ loggedMeals: logged })].sort(), ['breakfast', 'lunch']);
  assert.equal(slotOfHour(3), null);
  assert.equal(slotOfHour(10), 'breakfast');
  assert.equal(slotOfHour(11), 'lunch');
  assert.equal(slotOfHour(16), 'dinner');
  assert.equal(slotOfHour(23), 'dinner');
});

test('quiet hours 23:00–05:59', () => {
  assert.equal(isQuietTime({ hour: 23, minute: 0 }), true);
  assert.equal(isQuietTime({ hour: 2, minute: 30 }), true);
  assert.equal(isQuietTime({ hour: 5, minute: 59 }), true);
  assert.equal(isQuietTime({ hour: 6, minute: 0 }), false);
  assert.equal(isQuietTime({ hour: 22, minute: 59 }), false);
});

test('copy: every type has he+en, non-empty, with titles within 35 chars', () => {
  for (const type of Object.keys(NOTIF_TYPES)) {
    for (const isHe of [true, false]) {
      const c = getCopy(type, isHe);
      assert.ok(c.title && c.body, `${type} ${isHe ? 'he' : 'en'}`);
      assert.ok(c.title.length <= 35, `${type} title too long`);
      assert.ok([...c.body].length <= 90, `${type} body too long`);
    }
  }
  assert.equal(Object.keys(COPY).length, Object.keys(NOTIF_TYPES).length);
  assert.ok(USER_TYPES.every((t) => NOTIF_TYPES[t]));
});

import { workedOutToday, weeklyGoalMet } from './notifPlan.mjs';

test('workedOutToday / weeklyGoalMet use the local calendar day and a Sunday-start week', () => {
  const wed = new Date(2026, 10, 4, 10, 0); // Wednesday
  const w = (y, m, d) => ({ date: new Date(y, m, d, 9, 0).toISOString() });
  assert.equal(workedOutToday([w(2026, 10, 4)], wed), true);
  assert.equal(workedOutToday([w(2026, 10, 3)], wed), false);
  // Sun 1, Mon 2, Tue 3 = three workouts this week; target 3 → met, target 4 → not
  const week = [w(2026, 10, 1), w(2026, 10, 2), w(2026, 10, 3)];
  assert.equal(weeklyGoalMet(week, 3, wed), true);
  assert.equal(weeklyGoalMet(week, 4, wed), false);
  // a workout on the previous Saturday belongs to last week
  assert.equal(weeklyGoalMet([w(2026, 9, 31), w(2026, 10, 2)], 2, wed), false);
  assert.equal(weeklyGoalMet([], undefined, wed), false);
});
