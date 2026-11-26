// Run with:  node --test src/lib/workoutCycle.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cycleStatus, CYCLE_MS } from './workoutCycle.mjs';
import { buildPlan } from './notifPlan.mjs';
import { readPrefs } from './notifConfig.mjs';

// The real server maths, so these tests fail if the two definitions drift apart.
const { calculateCycleStatus } = createRequire(import.meta.url)('../../../server/utils/calculations.js');

const DAY = 86400000;
const at = (d, h = 9) => new Date(2026, 10, d, h, 0); // November 2026 (1 = Sunday)
const w = (date) => ({ date: date.toISOString() });
// What GET /workout/history answers: latest 30 newest-first + the cycle over ALL dates.
function historyAt(all, goal, now) {
  const newest = [...all].sort((a, b) => new Date(b.date) - new Date(a.date));
  return { workouts: newest.slice(0, 30), cycle: calculateCycleStatus(newest, goal, now) };
}
const workoutReminders = (status, now) => buildPlan({
  now: new Date(now),
  prefs: readPrefs({ getItem: () => null }),
  state: { workoutQuietUntil: status.met ? status.endsAt : null },
  isHe: true,
}).filter((n) => n.type === 'workout');

test('goal 4, fourth workout done: no workout reminder before the cycle ends, reminders after it', () => {
  const now = at(5, 10).getTime();
  const all = [w(at(2)), w(at(3)), w(at(4)), w(at(5))];
  const st = cycleStatus(historyAt(all, 4, now), 4, now);
  assert.deepEqual(st, { goal: 4, done: 4, met: true, endsAt: at(2).getTime() + CYCLE_MS });
  const r = workoutReminders(st, now);
  assert.ok(r.length > 0);
  assert.ok(r.every((n) => n.at.getTime() >= st.endsAt));
  assert.equal(r[0].at.getDate(), 9); // the cycle ends Monday the 9th at 09:00
});

test('workouts Wednesday–Saturday, checked on Sunday: still full, quiet until Wednesday', () => {
  const all = [w(at(4)), w(at(5)), w(at(6)), w(at(7))];
  const sunday = at(8, 7).getTime();
  assert.equal(new Date(sunday).getDay(), 0);
  const st = cycleStatus(historyAt(all, 4, sunday), 4, sunday);
  assert.equal(st.met, true);
  assert.equal(new Date(st.endsAt).getDay(), 3);
  const r = workoutReminders(st, sunday);
  assert.ok(r.every((n) => n.at.getTime() >= st.endsAt));
  assert.equal(r[0].at.getDate(), 11);
});

test('goal 1: reminders are still scheduled after the cycle ends', () => {
  const now = at(4, 9).getTime() + 60000;
  const st = cycleStatus(historyAt([w(at(4))], 1, now), 1, now);
  assert.equal(st.met, true);
  const r = workoutReminders(st, now);
  assert.equal(r.length, 7);
  assert.ok(r.every((n) => n.at.getTime() >= st.endsAt));
});

test('raising the goal or deleting a workout brings the reminders back at once', () => {
  const now = at(5, 7).getTime();
  const all = [w(at(2)), w(at(3)), w(at(4))];
  assert.equal(cycleStatus(historyAt(all, 3, now), 3, now).met, true);

  for (const st of [
    cycleStatus(historyAt(all, 4, now), 4, now),            // goal raised, history reloaded
    cycleStatus(historyAt(all, 3, now), 4, now),            // goal raised, history reload failed
    cycleStatus(historyAt(all.slice(0, 2), 3, now), 3, now), // a workout deleted
  ]) {
    assert.equal(st.met, false);
    assert.equal(workoutReminders(st, now)[0].at.getDate(), 5);
  }
});

test('limitReached with a cycleEndsAt in the past is not "met", and the count reads 0', () => {
  const now = at(10).getTime();
  const stale = { workouts: [w(at(2))], cycle: { limitReached: true, cycleCount: 1, cycleEndsAt: at(9).toISOString() } };
  assert.deepEqual(cycleStatus(stale, 1, now), { goal: 1, done: 0, met: false, endsAt: null });
});

test('the cycle ends on its own, without reloading the history', () => {
  const asked = at(4, 12).getTime();
  const history = historyAt([w(at(2)), w(at(3)), w(at(4))], 3, asked);
  assert.equal(cycleStatus(history, 3, at(9, 8).getTime()).met, true);
  assert.deepEqual(cycleStatus(history, 3, at(9, 9).getTime()), { goal: 3, done: 0, met: false, endsAt: null });
});

test('a cycle that is not full also reads 0 once its 7 days are over', () => {
  const asked = at(4, 12).getTime();
  const history = historyAt([w(at(1)), w(at(3))], 4, asked);
  assert.equal(history.cycle.cycleEndsAt, null);
  assert.equal(cycleStatus(history, 4, asked).done, 2);
  assert.equal(cycleStatus(history, 4, at(8, 9).getTime()).done, 0); // opened on the 1st at 09:00
});

test('more than 30 workouts: the server cycle wins over what the latest 30 suggest', () => {
  // A deterministic search for a history where the last 30 alone get it wrong.
  let seed = 7;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  let found = 0;
  for (let run = 0; run < 400; run++) {
    const all = [];
    let t = new Date(2026, 0, 1, 9).getTime();
    for (let i = 0; i < 45; i++) { t += (1 + Math.floor(rnd() * 4)) * DAY; all.push(w(new Date(t))); }
    const now = t + 3600000;
    const server = calculateCycleStatus(all, 3, now);
    const history = historyAt(all, 3, now);
    const st = cycleStatus(history, 3, now);
    assert.equal(st.met, server.limitReached, `run ${run}`);
    assert.equal(st.done, server.cycleCount, `run ${run}`);
    if (cycleStatus({ workouts: history.workouts }, 3, now).met !== server.limitReached) found++;
  }
  assert.ok(found > 0, 'the sample must include histories where 30 workouts are not enough');
});

test('server without `cycle`: the same definition, computed from the loaded workouts', () => {
  let seed = 11;
  const rnd = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  for (let run = 0; run < 300; run++) {
    const all = [];
    let t = new Date(2026, 0, 1, 9).getTime();
    const n = 1 + Math.floor(rnd() * 25);
    for (let i = 0; i < n; i++) { t += (1 + Math.floor(rnd() * 5)) * DAY; all.push(w(new Date(t))); }
    const goal = 1 + Math.floor(rnd() * 7);
    const now = t + Math.floor(rnd() * 9 * DAY);
    const server = calculateCycleStatus(all, goal, now);
    const st = cycleStatus({ workouts: all }, goal, now);
    assert.equal(st.met, server.limitReached, `run ${run}`);
    assert.equal(st.done, server.cycleCount, `run ${run}`);
    assert.equal(st.endsAt, server.cycleEndsAt && Date.parse(server.cycleEndsAt), `run ${run}`);
  }
});

test('no history yet, empty history, unknown goal', () => {
  const none = { goal: 4, done: 0, met: false, endsAt: null };
  assert.deepEqual(cycleStatus(null, undefined), none);
  assert.deepEqual(cycleStatus({ workouts: [] }, 0), none);
  assert.deepEqual(cycleStatus({ workouts: [], cycle: calculateCycleStatus([], 4) }, 4), none);
  // goal not loaded: the server's verdict stands
  const now = at(5, 7).getTime();
  const history = historyAt([w(at(2)), w(at(3)), w(at(4))], 3, now);
  assert.equal(cycleStatus(history, undefined, now).met, true);
});
