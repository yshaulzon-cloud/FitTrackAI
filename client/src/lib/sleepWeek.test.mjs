// Run with:  node --test src/lib/sleepWeek.test.mjs   (from client/)
import test from 'node:test';
import assert from 'node:assert/strict';
import { sleepWeek, nightsLabel } from './sleepWeek.mjs';

// Wednesday 25 Nov 2026, mid-afternoon, device-local. The window is Thu 19 … Wed 25.
const TODAY = new Date(2026, 10, 25, 15, 30);
// A log N days before TODAY, stored the way the server does (a midnight instant).
const night = (daysAgo, hours, quality) => ({
  date: new Date(2026, 10, 25 - daysAgo).toISOString(),
  hours,
  quality,
});

test('no nights at all → nothing to show', () => {
  for (const history of [[], undefined, null, 'x']) {
    const w = sleepWeek(history, TODAY);
    assert.equal(w.nights, 0);
    assert.equal(w.avgHours, 0);
    assert.equal(w.avgQuality, null);
    assert.equal(w.days.length, 7);
  }
});

test('one night', () => {
  const w = sleepWeek([night(0, 6.5, 'bad')], TODAY);
  assert.deepEqual([w.nights, w.avgHours, w.avgQuality], [1, 6.5, 'bad']);
});

test('3 nights (7, 8, 6.5 h; good, great, ok) → 7.2 h and good', () => {
  const w = sleepWeek([night(0, 7, 'good'), night(1, 8, 'great'), night(2, 6.5, 'ok')], TODAY);
  assert.equal(w.nights, 3);
  assert.equal(w.avgHours, 7.2); // 21.5 / 3 = 7.1666…
  assert.equal(w.avgQuality, 'good'); // (3 + 4 + 2) / 3 = 3
});

test('7 nights', () => {
  const hours = [7, 7.5, 8, 6, 6.5, 9, 7.5];
  const history = hours.map((h, i) => night(i, h, 'good'));
  const w = sleepWeek(history, TODAY);
  assert.equal(w.nights, 7);
  assert.equal(w.avgHours, 7.4); // 51.5 / 7 = 7.357…
  assert.equal(w.avgQuality, 'good');
});

test('missing nights in the middle are left out, not counted as 0', () => {
  const w = sleepWeek([night(0, 8, 'good'), night(3, 6, 'good'), night(5, 7, 'good')], TODAY);
  assert.equal(w.nights, 3);
  assert.equal(w.avgHours, 7); // (8 + 6 + 7) / 3, not / 7
  assert.deepEqual(w.days.map((d) => d.hours), [0, 7, 0, 6, 0, 0, 8]);
});

test('a night outside the window is ignored (7 days ago, and the future)', () => {
  const w = sleepWeek([
    night(-1, 3, 'bad'),   // tomorrow
    night(0, 8, 'good'),
    night(6, 7, 'good'),   // oldest day inside the window
    night(7, 4, 'bad'),    // one day too old
    night(20, 5, 'bad'),
  ], TODAY);
  assert.equal(w.nights, 2);
  assert.equal(w.avgHours, 7.5);
  assert.equal(w.avgQuality, 'good');
});

test('window edges follow the calendar day, not a 7 × 24 h span', () => {
  const lateToday = new Date(2026, 10, 25, 23, 59);
  const earlyToday = new Date(2026, 10, 25, 0, 1);
  for (const now of [lateToday, earlyToday]) {
    const w = sleepWeek([night(6, 7, 'ok'), night(7, 9, 'ok')], now);
    assert.equal(w.nights, 1);
    assert.equal(w.avgHours, 7);
  }
});

test('average quality of exactly 2.5 rounds up', () => {
  assert.equal(sleepWeek([night(0, 7, 'ok'), night(1, 7, 'good')], TODAY).avgQuality, 'good');
  assert.equal(sleepWeek([night(0, 7, 'bad'), night(1, 7, 'bad'), night(2, 7, 'good'), night(3, 7, 'good')], TODAY).avgQuality, 'ok'); // 2.0
  assert.equal(sleepWeek([night(0, 7, 'good'), night(1, 7, 'great')], TODAY).avgQuality, 'great'); // 3.5
  assert.equal(sleepWeek([night(0, 7, 'bad'), night(1, 7, 'ok')], TODAY).avgQuality, 'ok'); // 1.5
});

test('a log without a quality counts as the server default (ok)', () => {
  const w = sleepWeek([{ date: night(0, 7).date, hours: 7 }, night(1, 7, 'whatever')], TODAY);
  assert.equal(w.avgQuality, 'ok');
});

test('bad rows are skipped, one entry per day (first wins)', () => {
  const w = sleepWeek([
    { date: 'not a date', hours: 8, quality: 'great' },
    { date: night(0, 8, 'good').date, hours: 'x' },
    night(1, 7, 'good'),
    night(1, 5, 'bad'), // duplicate day, older row: ignored
    null,
  ], TODAY);
  assert.equal(w.nights, 1);
  assert.equal(w.avgHours, 7);
});

test('days array: oldest first, today last', () => {
  const w = sleepWeek([night(0, 8, 'good')], TODAY);
  assert.equal(w.days[6].date.getDate(), 25);
  assert.equal(w.days[0].date.getDate(), 19);
  assert.equal(w.days[6].hours, 8);
});

test('nightsLabel', () => {
  assert.equal(nightsLabel(5, true), 'מתוך 5 לילות');
  assert.equal(nightsLabel(1, true), 'מתוך לילה אחד');
  assert.equal(nightsLabel(2, true), 'מתוך 2 לילות');
  assert.equal(nightsLabel(5, false), 'from 5 nights');
  assert.equal(nightsLabel(1, false), 'from 1 night');
});
