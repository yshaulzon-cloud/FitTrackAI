// startOfUserDay must return the user's real local midnight, also on the two days a year the clock changes
// (QA Q6: on the day Israel's clocks go back, "midnight" came out as 01:00 and anything logged between 00:00
// and 01:00 that Sunday was filed under the previous day).
//
// Run: cd server && node --test utils/dates.test.js
const test = require('node:test');
const assert = require('node:assert');
const { startOfUserDay, startOfUserDayOffset, diffUserDays } = require('./dates');

const local = (tz, d) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'short', timeStyle: 'medium', hourCycle: 'h23' }).format(d);
const dateOf = (tz, d) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, dateStyle: 'short' }).format(d);

test('Q6: the day the clocks go back (Israel, 25 Oct 2026, a 25-hour day) starts at 00:00, not 01:00', () => {
  const start = startOfUserDay('Asia/Jerusalem', new Date('2026-10-25T10:00:00Z'));
  assert.strictEqual(local('Asia/Jerusalem', start), '25/10/2026, 00:00:00');
  assert.strictEqual(start.toISOString(), '2026-10-24T21:00:00.000Z');
  // an event at 00:30 local that Sunday (still IDT, 21:30Z) belongs to that Sunday
  const ev = new Date('2026-10-24T21:30:00Z');
  assert.strictEqual(startOfUserDay('Asia/Jerusalem', ev).toISOString(), start.toISOString());
  // and the Saturday before ends at that same instant
  assert.strictEqual(diffUserDays(start, startOfUserDay('Asia/Jerusalem', new Date('2026-10-24T10:00:00Z'))), 1);
});

test('the day the clocks go forward (Israel, 27 Mar 2026, a 23-hour day) also starts at 00:00', () => {
  const start = startOfUserDay('Asia/Jerusalem', new Date('2026-03-27T10:00:00Z'));
  assert.strictEqual(local('Asia/Jerusalem', start), '27/03/2026, 00:00:00');
});

test('every day of 2026 starts at local 00:00 of its own date, in zones with and without DST', () => {
  const bad = [];
  for (const tz of ['Asia/Jerusalem', 'Europe/London', 'America/New_York', 'Australia/Lord_Howe', 'Pacific/Auckland', 'Asia/Tehran', 'UTC']) {
    for (let day = 0; day < 365; day++) {
      const noon = new Date(Date.UTC(2026, 0, 1 + day, 12));
      const got = startOfUserDay(tz, noon);
      if (local(tz, got) !== `${dateOf(tz, noon)}, 00:00:00`) bad.push(`${tz} ${dateOf(tz, noon)} → ${local(tz, got)}`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('startOfUserDayOffset steps whole calendar days across a clock change', () => {
  const ref = new Date('2026-10-23T10:00:00Z'); // Friday
  const days = [0, 1, 2, 3].map((n) => local('Asia/Jerusalem', startOfUserDayOffset('Asia/Jerusalem', n, ref)));
  assert.deepStrictEqual(days, ['23/10/2026, 00:00:00', '24/10/2026, 00:00:00', '25/10/2026, 00:00:00', '26/10/2026, 00:00:00']);
});

test('a bad or missing timezone falls back to Asia/Jerusalem instead of throwing', () => {
  const a = startOfUserDay(undefined, new Date('2026-07-12T10:00:00Z'));
  const b = startOfUserDay('Not/AZone', new Date('2026-07-12T10:00:00Z'));
  assert.strictEqual(a.toISOString(), '2026-07-11T21:00:00.000Z');
  assert.strictEqual(b.toISOString(), a.toISOString());
});
