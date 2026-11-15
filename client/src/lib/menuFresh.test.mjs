// Run with:  node --test src/lib/menuFresh.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { menuStaleReason, sumMeals, menuVsTarget } from './menuFresh.mjs';

test('menuStaleReason: yesterday\'s menu is not shown today', () => {
  assert.equal(menuStaleReason({ savedDate: 'Mon Nov 02 2026', today: 'Tue Nov 03 2026', menuTarget: 2000, currentTarget: 2000 }), 'date');
});

test('menuStaleReason: a menu saved by an older version (no date) counts as old', () => {
  assert.equal(menuStaleReason({ savedDate: undefined, today: 'Tue Nov 03 2026', menuTarget: 2000, currentTarget: 2000 }), 'date');
  assert.equal(menuStaleReason({ savedDate: null, today: 'Tue Nov 03 2026' }), 'date');
});

test('menuStaleReason: same day, but the day\'s target changed (rest → training after a workout, or new weight)', () => {
  assert.equal(menuStaleReason({ savedDate: 'Tue Nov 03 2026', today: 'Tue Nov 03 2026', menuTarget: 1700, currentTarget: 2120 }), 'target');
});

test('menuStaleReason: same day, same target → still valid; an unknown target is not a reason', () => {
  assert.equal(menuStaleReason({ savedDate: 'Tue Nov 03 2026', today: 'Tue Nov 03 2026', menuTarget: 2000, currentTarget: 2000 }), null);
  assert.equal(menuStaleReason({ savedDate: 'Tue Nov 03 2026', today: 'Tue Nov 03 2026', menuTarget: 2000, currentTarget: 1999.6 }), null); // rounding
  assert.equal(menuStaleReason({ savedDate: 'Tue Nov 03 2026', today: 'Tue Nov 03 2026', menuTarget: 2000, currentTarget: null }), null);
  assert.equal(menuStaleReason({ savedDate: 'Tue Nov 03 2026', today: 'Tue Nov 03 2026', menuTarget: undefined, currentTarget: 2000 }), null);
});

test('sumMeals: adds a field over the meals, ignoring gaps', () => {
  assert.equal(sumMeals([{ calories: 300 }, { calories: 450 }, {}], 'calories'), 750);
  assert.equal(sumMeals(undefined, 'calories'), 0);
  assert.equal(sumMeals([{ protein: '20' }, null], 'protein'), 20);
});

test('menuVsTarget: under, over and on target', () => {
  assert.deepEqual(menuVsTarget(1300, 2000), { total: 1300, target: 2000, gap: -700, over: false, pct: 65, level: 'far' });
  assert.deepEqual(menuVsTarget(2150, 2000), { total: 2150, target: 2000, gap: 150, over: true, pct: 108, level: 'near' });
  assert.equal(menuVsTarget(1980, 2000).level, 'close');
  assert.equal(menuVsTarget(2000, 2000).gap, 0);
});

test('menuVsTarget: no usable target or total → null (never a made-up comparison)', () => {
  assert.equal(menuVsTarget(1500, 0), null);
  assert.equal(menuVsTarget(1500, undefined), null);
  assert.equal(menuVsTarget(NaN, 2000), null);
});
