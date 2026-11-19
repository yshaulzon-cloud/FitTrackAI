// Run with:  node --test src/lib/sessionKeep.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasProgress, keepOnLeave } from './sessionKeep.mjs';

const ex = (...sets) => ({ name: 'x', sets: sets.map((done) => ({ done })) });

test('leaving a workout with at least one done set keeps the session (the dialog promises it)', () => {
  assert.equal(keepOnLeave([ex(false, false), ex(true, false)]), true);
  assert.equal(keepOnLeave([ex(true)]), true);
});

test('leaving a workout where nothing was done discards it (nothing to resume)', () => {
  assert.equal(keepOnLeave([ex(false, false), ex(false)]), false);
  assert.equal(keepOnLeave([]), false);
});

test('malformed or missing data never throws and counts as no progress', () => {
  for (const bad of [undefined, null, 'x', [null], [{}], [{ sets: null }], [{ sets: [null] }], [{ sets: [{ done: 'yes' }] }]]) {
    assert.equal(hasProgress(bad), false, JSON.stringify(bad));
  }
});
