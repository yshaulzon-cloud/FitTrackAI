import test from 'node:test';
import assert from 'node:assert/strict';
import { dayTypeNote, roundedDeltaPct } from './dayTypeNote.mjs';

// workoutsPerWeek = 3 → server sends rest −4.5, training +6 (server/utils/dayType.js)
test('rest day with 3 workouts a week: lower by about 5%', () => {
  const he = dayTypeNote({ type: 'rest', deltaPct: -4.5 }, true);
  assert.equal(he.label, 'יום מנוחה');
  assert.equal(he.summary, 'היעד היום נמוך בכ-5% מהרגיל. הממוצע השבועי נשאר אותו דבר.');
  assert.match(he.detail, /^מנוחה היא חלק מהאימון/);

  const en = dayTypeNote({ type: 'rest', deltaPct: -4.5 }, false);
  assert.equal(en.label, 'Rest day');
  assert.equal(en.summary, 'Today\'s target is about 5% below usual. Your weekly average stays the same.');
  assert.match(en.detail, /^Rest is part of training/);
});

test('training day with 3 workouts a week: higher by about 6%', () => {
  const he = dayTypeNote({ type: 'training', deltaPct: 6 }, true);
  assert.equal(he.label, 'יום אימון');
  assert.equal(he.summary, 'היעד היום גבוה בכ-6% מהרגיל. הממוצע השבועי נשאר אותו דבר.');
  assert.equal(he.detail, null);

  const en = dayTypeNote({ type: 'training', deltaPct: 6 }, false);
  assert.equal(en.label, 'Training day');
  assert.equal(en.summary, 'Today\'s target is about 6% above usual. Your weekly average stays the same.');
  assert.equal(en.detail, null);
});

test('no +, − or decimal digit in any text', () => {
  for (const type of ['rest', 'training']) {
    for (const deltaPct of [-15, -4.5, -0.4, 0, 0.4, 3.3, 6]) {
      for (const isHe of [true, false]) {
        const n = dayTypeNote({ type, deltaPct }, isHe);
        const all = [n.label, n.summary, n.detail || ''].join(' ');
        assert.doesNotMatch(all, /[+−–—]/, `${type} ${deltaPct}`);
        assert.doesNotMatch(all, /\d\.\d/, `${type} ${deltaPct}`);
      }
    }
  }
});

test('a delta that rounds to 0 reads as "as usual"', () => {
  for (const deltaPct of [0, 0.4, -0.4]) {
    assert.equal(dayTypeNote({ type: 'rest', deltaPct }, true).summary, 'היעד היום כרגיל.');
    assert.equal(dayTypeNote({ type: 'rest', deltaPct }, false).summary, 'Today\'s target is as usual.');
  }
});

test('0.5 rounds up, direction follows the sign', () => {
  assert.equal(roundedDeltaPct(-0.5), 1);
  assert.equal(roundedDeltaPct(0.5), 1);
  assert.match(dayTypeNote({ type: 'rest', deltaPct: -0.5 }, true).summary, /נמוך בכ-1%/);
  assert.match(dayTypeNote({ type: 'training', deltaPct: 0.5 }, false).summary, /about 1% above usual/);
});

test('bad input does not throw and reads as "as usual"', () => {
  assert.equal(roundedDeltaPct(undefined), 0);
  assert.equal(roundedDeltaPct('x'), 0);
  assert.equal(dayTypeNote({ type: 'rest' }, true).summary, 'היעד היום כרגיל.');
});
