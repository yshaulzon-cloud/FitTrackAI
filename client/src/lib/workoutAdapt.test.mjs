// Run with:  node --test src/lib/workoutAdapt.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRepRange, weightStep, recommend, markTooHard, tooHardAtFor, isAdaptEnabled, setAdaptEnabled, explain } from './workoutAdapt.mjs';

const sess = (date, ...sets) => ({ date, sets: sets.map(([reps, weight]) => ({ reps, weight })) });
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

test('parseRepRange', () => {
  assert.deepEqual(parseRepRange('8-12'), { min: 8, max: 12 });
  assert.deepEqual(parseRepRange('12'), { min: 12, max: 12 });
  assert.deepEqual(parseRepRange('10–15 חזרות'), { min: 10, max: 15 });
  assert.equal(parseRepRange(''), null);
  assert.equal(parseRepRange(undefined), null);
});

test('weightStep grows with the load', () => {
  assert.deepEqual([10, 40, 100].map(weightStep), [1, 2.5, 5]);
});

test('all sets at the top of the range → add weight and restart at the bottom', () => {
  const r = recommend({ recent: [sess('2026-11-01', [12, 40], [12, 40], [12, 40])], targetReps: '8-12' });
  assert.deepEqual([r.action, r.weight, r.reps, r.reason.code], ['increase', 42.5, 8, 'topRange']);
});

test('inside the range → same weight, one more rep, capped at the top', () => {
  const r = recommend({ recent: [sess('2026-11-01', [9, 40], [8, 40], [8, 40])], targetReps: '8-12' });
  assert.deepEqual([r.action, r.weight, r.reps], ['hold', 40, 9]);
  const capped = recommend({ recent: [sess('2026-11-01', [12, 40], [12, 40], [11, 40])], targetReps: '8-12' });
  assert.equal(capped.reps, 12);
});

test('missing the minimum once holds; twice in a row lowers by ~10%', () => {
  const once = recommend({ recent: [sess('2026-11-01', [6, 40], [6, 40])], targetReps: '8-12' });
  assert.deepEqual([once.action, once.weight, once.reason.code], ['hold', 40, 'missedOnce']);
  const twice = recommend({ recent: [sess('2026-11-08', [6, 40]), sess('2026-11-01', [7, 40])], targetReps: '8-12' });
  assert.deepEqual([twice.action, twice.weight, twice.reps, twice.reason.code], ['decrease', 36, 8, 'missedTwice']);
});

test('a lighter warm-up set does not mask or fake a result', () => {
  const r = recommend({ recent: [sess('2026-11-01', [15, 20], [12, 60], [12, 60])], targetReps: '8-12' });
  assert.deepEqual([r.action, r.weight], ['increase', 65]);
});

test('bodyweight: top of range adds a rep instead of weight', () => {
  const r = recommend({ recent: [sess('2026-11-01', [15, 0], [15, 0], [15, 0])], targetReps: '10-15' });
  assert.deepEqual([r.action, r.weight, r.reps], ['increase', 0, 16]);
});

test('"too hard" flag newer than the last session lowers the load; older or expired flags are ignored', () => {
  const recent = [sess('2026-11-01T10:00:00Z', [10, 40], [10, 40])];
  const now = new Date('2026-11-05T10:00:00Z').getTime();
  const r = recommend({ recent, targetReps: '8-12', tooHardAt: '2026-11-03T10:00:00Z', now });
  assert.deepEqual([r.action, r.weight, r.reason.code], ['decrease', 36, 'tooHard']);
  assert.equal(recommend({ recent, targetReps: '8-12', tooHardAt: '2026-10-30T10:00:00Z', now }).action, 'hold');
  const later = new Date('2026-11-30T10:00:00Z').getTime();
  assert.equal(recommend({ recent, targetReps: '8-12', tooHardAt: '2026-11-03T10:00:00Z', now: later }).action, 'hold');
});

test('no data, unreadable target, or only empty sets → null', () => {
  assert.equal(recommend({ recent: [], targetReps: '8-12' }), null);
  assert.equal(recommend({ recent: [sess('d', [10, 40])], targetReps: 'max' }), null);
  assert.equal(recommend({ recent: [{ date: 'd', sets: [] }], targetReps: '8-12' }), null);
});

test('deterministic: same input twice gives the same answer', () => {
  const input = { recent: [sess('2026-11-01', [10, 40], [9, 40])], targetReps: '8-12' };
  assert.deepEqual(recommend(input), recommend(input));
});

test('flags and the on/off preference round-trip through storage', () => {
  const st = mem();
  assert.equal(isAdaptEnabled(st), true);
  setAdaptEnabled(false, st);
  assert.equal(isAdaptEnabled(st), false);
  markTooHard('Squat', st, new Date('2026-11-03T00:00:00Z'));
  assert.equal(tooHardAtFor('Squat', st), '2026-11-03T00:00:00.000Z');
  assert.equal(tooHardAtFor('Row', st), null);
});

test('every reason code has a Hebrew and an English sentence', () => {
  for (const code of ['topRange', 'topRangeBodyweight', 'tooHard', 'missedTwice', 'missedOnce', 'building']) {
    const rec = { reason: { code, reps: 10, from: 40 } };
    assert.ok(explain(rec, true).length > 5);
    assert.ok(explain(rec, false).length > 5);
  }
});
