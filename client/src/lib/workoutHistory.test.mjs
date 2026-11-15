// Run with:  node --test src/lib/workoutHistory.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { doneSets, wasPerformed, exerciseDetail, summarizeWorkout, compareWithPrevious } from './workoutHistory.mjs';

const set = (reps, weight, done = true) => ({ reps, weight, done, durationSec: null });
const ex = (name, setLog, extra = {}) => ({ name, mode: 'reps', setLog, ...extra });

test('doneSets / wasPerformed: skipped exercises and legacy records', () => {
  assert.equal(doneSets(ex('a', [set(10, 20), set(10, 20, false)])).length, 1);
  assert.equal(wasPerformed(ex('a', [set(10, 20, false)])), false); // fully skipped
  assert.equal(wasPerformed(ex('a', [set(10, 20)])), true);
  assert.equal(wasPerformed({ name: 'old', sets: 3, reps: '10' }), true); // legacy summary
  assert.equal(wasPerformed({ name: 'old', sets: 0 }), false);
});

test('exerciseDetail: weighted, bodyweight, timed, legacy', () => {
  const d = exerciseDetail(ex('bench', [set(10, 40), set(8, 50), set(6, 50)]));
  assert.deepEqual(d, { kind: 'reps', sets: 3, reps: 8, weight: 50, totalReps: 24 });
  assert.equal(exerciseDetail(ex('pushups', [set(12, null), set(10, null)])).weight, null);
  const t = exerciseDetail({ name: 'plank', mode: 'time', setLog: [{ done: true, durationSec: 45 }, { done: true, durationSec: 30 }] });
  assert.deepEqual(t, { kind: 'time', seconds: 75, sets: 2 });
  assert.deepEqual(exerciseDetail({ name: 'old', sets: 3, reps: '8-12' }), { kind: 'legacy', sets: 3, reps: '8-12' });
});

test('summarizeWorkout ignores skipped exercises', () => {
  const w = { totalVolume: 1200, durationMinutes: 48, exercises: [ex('a', [set(10, 20), set(10, 20)]), ex('b', [set(10, 20, false)]), { name: 'old', sets: 2, reps: '10' }] };
  assert.deepEqual(summarizeWorkout(w), { exerciseCount: 2, setCount: 4, volume: 1200, minutes: 48 });
});

test('compareWithPrevious: heavier / lighter / same, against the latest EARLIER workout that has it', () => {
  const ws = [
    { exercises: [ex('bench', [set(8, 52.5)])] },        // newest
    { exercises: [ex('squat', [set(8, 80)])] },          // no bench here → skipped
    { exercises: [ex('bench', [set(8, 50)])] },
    { exercises: [ex('bench', [set(8, 40)])] },
  ];
  assert.deepEqual(compareWithPrevious(ws, 0, 'bench'), { direction: 'up', delta: 2.5, unit: 'kg' });
  assert.deepEqual(compareWithPrevious(ws, 2, 'bench'), { direction: 'up', delta: 10, unit: 'kg' });
  assert.equal(compareWithPrevious(ws, 3, 'bench'), null); // oldest: nothing earlier
  const down = [{ exercises: [ex('bench', [set(8, 40)])] }, { exercises: [ex('bench', [set(8, 50)])] }];
  assert.deepEqual(compareWithPrevious(down, 0, 'bench'), { direction: 'down', delta: -10, unit: 'kg' });
  const same = [{ exercises: [ex('bench', [set(8, 50)])] }, { exercises: [ex('bench', [set(10, 50)])] }];
  assert.deepEqual(compareWithPrevious(same, 0, 'bench'), { direction: 'same', delta: 0, unit: 'kg' });
});

test('compareWithPrevious: bodyweight compares total reps, timed compares seconds', () => {
  const bw = [{ exercises: [ex('pushups', [set(12, null), set(12, null)])] }, { exercises: [ex('pushups', [set(10, null), set(10, null)])] }];
  assert.deepEqual(compareWithPrevious(bw, 0, 'pushups'), { direction: 'up', delta: 4, unit: 'reps' });
  const timed = (s) => ({ exercises: [{ name: 'plank', mode: 'time', setLog: [{ done: true, durationSec: s }] }] });
  assert.deepEqual(compareWithPrevious([timed(40), timed(60)], 0, 'plank'), { direction: 'down', delta: -20, unit: 'sec' });
});

test('compareWithPrevious: legacy records and missing exercises give null', () => {
  assert.equal(compareWithPrevious([{ exercises: [{ name: 'old', sets: 3, reps: '10' }] }, { exercises: [ex('old', [set(8, 20)])] }], 0, 'old'), null);
  assert.equal(compareWithPrevious([{ exercises: [] }], 0, 'x'), null);
});
