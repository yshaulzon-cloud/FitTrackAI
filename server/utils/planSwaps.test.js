const test = require('node:test');
const assert = require('node:assert');
const { applyPlanSwaps, recordSwap } = require('./planSwaps');

const plan = {
  days: [
    { day: 'A', exercises: [{ name: 'Bench', sets: 4, reps: '8', muscleGroup: 'chest' }, { name: 'Row', sets: 3, reps: '10', muscleGroup: 'back' }] },
    { day: 'B', exercises: [{ name: 'Bench', sets: 3, reps: '12', muscleGroup: 'chest' }] },
  ],
};

test('applies a swap to every day, keeping sets and reps', () => {
  const out = applyPlanSwaps(plan, [{ from: 'Bench', to: 'Push Ups', muscleGroup: 'chest' }]);
  assert.equal(out.days[0].exercises[0].name, 'Push Ups');
  assert.equal(out.days[0].exercises[0].sets, 4);
  assert.equal(out.days[1].exercises[0].name, 'Push Ups');
  assert.equal(out.days[1].exercises[0].reps, '12');
  assert.equal(out.days[0].exercises[1].name, 'Row');
});

test('does not mutate the input and ignores unknown swaps', () => {
  const copy = JSON.parse(JSON.stringify(plan));
  applyPlanSwaps(plan, [{ from: 'Bench', to: 'X' }]);
  assert.deepEqual(plan, copy);
  assert.deepEqual(applyPlanSwaps(plan, [{ from: 'Nope', to: 'X' }]).days[0].exercises.map((e) => e.name), ['Bench', 'Row']);
  assert.equal(applyPlanSwaps(plan, []), plan);
  assert.equal(applyPlanSwaps(plan, undefined), plan);
  assert.equal(applyPlanSwaps(null, [{ from: 'a', to: 'b' }]), null);
});

test('muscle group: the replacement\'s wins when given, otherwise the original stays', () => {
  assert.equal(applyPlanSwaps(plan, [{ from: 'Row', to: 'Pulldown', muscleGroup: 'lats' }]).days[0].exercises[1].muscleGroup, 'lats');
  assert.equal(applyPlanSwaps(plan, [{ from: 'Row', to: 'Pulldown' }]).days[0].exercises[1].muscleGroup, 'back');
});

test('recordSwap: adds, replaces and removes', () => {
  let s = recordSwap([], { from: 'Bench', to: 'Push Ups', muscleGroup: 'chest' });
  assert.deepEqual(s, [{ from: 'Bench', to: 'Push Ups', muscleGroup: 'chest' }]);
  // the client now sees "Push Ups" and swaps THAT: the original stays the key
  s = recordSwap(s, { from: 'Push Ups', to: 'DB Press', muscleGroup: 'chest' });
  assert.deepEqual(s, [{ from: 'Bench', to: 'DB Press', muscleGroup: 'chest' }]);
  // going back to the original removes the entry
  s = recordSwap(s, { from: 'DB Press', to: 'Bench' });
  assert.deepEqual(s, []);
});

test('recordSwap: independent exercises keep independent entries, no duplicates per original', () => {
  let s = recordSwap([], { from: 'Bench', to: 'A' });
  s = recordSwap(s, { from: 'Row', to: 'B' });
  s = recordSwap(s, { from: 'Bench', to: 'C' });
  assert.deepEqual(s.map((x) => [x.from, x.to]).sort(), [['Bench', 'C'], ['Row', 'B']]);
});

test('recordSwap never mutates its input', () => {
  const input = [{ from: 'Bench', to: 'A', muscleGroup: 'chest' }];
  const copy = JSON.parse(JSON.stringify(input));
  recordSwap(input, { from: 'A', to: 'B' });
  assert.deepEqual(input, copy);
});
