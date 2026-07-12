// ── Timezone-aware day boundaries ───────────────────────────────────────────
// The server runs on Render in UTC, but users live in a real timezone (default
// Israel). Computing "today" with new Date().setHours(0,0,0,0) yields UTC
// midnight — which is 02:00–03:00 in Israel — so activity in the small hours
// gets attributed to the wrong calendar day and the streak miscounts. Every
// streak/day calculation must anchor to the *user's* local midnight instead.
//
// Implemented with the built-in Intl API (no extra dependency) so it works on
// the Render free tier as-is.

const DEFAULT_TZ = 'Asia/Jerusalem';

// A quick sanity check that a timezone string is usable; falls back to the
// default rather than throwing on a malformed/absent value.
function resolveTz(tz) {
  if (!tz || typeof tz !== 'string') return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

// Offset (ms) such that: instant.getTime() + offset === wall-clock-in-tz
// expressed as if it were UTC. Positive for zones ahead of UTC (e.g. +3h for
// Israel summer). Computed at the given instant so DST is handled correctly.
function tzOffsetMs(tz, instant) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const map = {};
  for (const p of dtf.formatToParts(instant)) map[p.type] = p.value;
  const asUTC = Date.UTC(
    +map.year, +map.month - 1, +map.day,
    +map.hour, +map.minute, +map.second
  );
  return asUTC - instant.getTime();
}

// The UTC instant corresponding to local midnight of the user's calendar day
// that contains `ref`. Returns a Date. This is the timezone-correct replacement
// for `const d = new Date(); d.setHours(0,0,0,0)`.
function startOfUserDay(tz, ref = new Date()) {
  tz = resolveTz(tz);
  // 1. Which calendar date is it, in the user's timezone?
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ref); // "2026-07-12"
  const [y, m, d] = ymd.split('-').map(Number);
  // 2. Treat that date's midnight as if it were UTC, then subtract the zone
  //    offset to get the true UTC instant of local midnight.
  const guessUTC = Date.UTC(y, m - 1, d, 0, 0, 0);
  const offset = tzOffsetMs(tz, new Date(guessUTC));
  return new Date(guessUTC - offset);
}

// Local midnight `days` calendar days away from the day containing `ref`.
// Shifting by whole 24h blocks then re-normalising is DST-safe: a ±1h DST jump
// can never move the instant across a full calendar day.
function startOfUserDayOffset(tz, days, ref = new Date()) {
  const shifted = new Date(ref.getTime() + days * 86400000);
  return startOfUserDay(tz, shifted);
}

// Number of whole calendar days between two local-midnight instants
// (a - b), rounded to absorb DST-induced 23h/25h days.
function diffUserDays(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

module.exports = {
  DEFAULT_TZ,
  resolveTz,
  startOfUserDay,
  startOfUserDayOffset,
  diffUserDays,
};
