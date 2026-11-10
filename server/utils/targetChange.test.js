const test = require('node:test');
const assert = require('node:assert');
const { computeTargets, describeTargetChange } = require('./targetChange');

const base = { weight: 80, height: 180, age: 30, gender: 'male', goal: 'maintain', experience: 'intermediate', workoutsPerWeek: 4 };

test('computeTargets: calories and macros for a complete profile, null for an incomplete one', () => {
  const t = computeTargets(base);
  assert.ok(t.calorieTarget > 1500 && t.calorieTarget < 4000);
  assert.ok(t.protein > 0 && t.carbs > 0 && t.fat > 0);
  assert.strictEqual(computeTargets({ goal: 'cut' }), null);
  assert.strictEqual(computeTargets(null), null);
});

test('a cut gives a lower calorie target than maintain, a bulk a higher one', () => {
  const m = computeTargets(base).calorieTarget;
  assert.ok(computeTargets({ ...base, goal: 'cut' }).calorieTarget < m);
  assert.ok(computeTargets({ ...base, goal: 'bulk' }).calorieTarget > m);
});

test('goal change is announced with from / to', () => {
  const before = computeTargets(base);
  const after = computeTargets({ ...base, goal: 'cut' });
  const c = describeTargetChange({ before, after, weightBefore: 80, weightAfter: 80, goalChanged: true });
  assert.strictEqual(c.reason, 'goal');
  assert.strictEqual(c.from, before);
  assert.strictEqual(c.to, after);
});

test('weight change of at least 1 kg is announced; a smaller one is not', () => {
  const before = computeTargets(base);
  const heavier = { ...base, weight: 82 };
  const c = describeTargetChange({ before, after: computeTargets(heavier), weightBefore: 80, weightAfter: 82, goalChanged: false });
  assert.strictEqual(c.reason, 'weight');
  const small = { ...base, weight: 80.5 };
  assert.strictEqual(describeTargetChange({ before, after: computeTargets(small), weightBefore: 80, weightAfter: 80.5, goalChanged: false }), null);
});

test('both at once → reason "both"; nothing changed → null; missing targets → null', () => {
  const before = computeTargets(base);
  const after = computeTargets({ ...base, weight: 75, goal: 'cut' });
  assert.strictEqual(describeTargetChange({ before, after, weightBefore: 80, weightAfter: 75, goalChanged: true }).reason, 'both');
  assert.strictEqual(describeTargetChange({ before, after: before, weightBefore: 80, weightAfter: 80, goalChanged: false }), null);
  assert.strictEqual(describeTargetChange({ before: null, after, weightBefore: 80, weightAfter: 75, goalChanged: true }), null);
});

test('goal changed but the target happens to be identical → nothing to announce', () => {
  const t = computeTargets(base);
  assert.strictEqual(describeTargetChange({ before: t, after: { ...t }, weightBefore: 80, weightAfter: 80, goalChanged: true }), null);
});
