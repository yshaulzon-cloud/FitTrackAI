// The last 7 calendar days of sleep: how many nights were logged, the average
// hours and the average quality. Used by the "Today" tab card and by the
// "Journey" tab, so both screens show the same number for the same data.
//
// Window: the 7 local calendar days ending today (today included), on the
// device's clock. A night that was not logged is not a 0-hour night, it is
// simply left out of the averages.
import { dayKey } from './sleepAdvice.mjs';

const WINDOW_DAYS = 7;

// Ordered worst → best. The score is the 1-based position.
const QUALITIES = ['bad', 'ok', 'good', 'great'];
// A log without a quality (or an unknown one) counts as the server's default, 'ok'.
const DEFAULT_SCORE = 2;

const scoreOf = (q) => {
  const i = QUALITIES.indexOf(q);
  return i === -1 ? DEFAULT_SCORE : i + 1;
};

// → { days, nights, avgHours, avgQuality }
//   days        7 entries, oldest first, the last one is today:
//               { date: Date (local midnight), hours (0 = not logged), quality }
//   nights      how many of the 7 days have a log
//   avgHours    one decimal, 0 when there are no nights
//   avgQuality  'bad' | 'ok' | 'good' | 'great', null when there are no nights
//               (mean of the 1..4 scores, rounded half up)
export function sleepWeek(history, today = new Date()) {
  const list = Array.isArray(history) ? history : [];
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (WINDOW_DAYS - 1 - i));
    date.setHours(0, 0, 0, 0);
    const key = dayKey(date);
    // History is newest first and holds one entry per day; the first match wins.
    const log = list.find((s) => {
      const d = new Date(s?.date);
      return Number.isFinite(d.getTime()) && dayKey(d) === key;
    });
    const hours = Number(log?.hours);
    return {
      date,
      hours: Number.isFinite(hours) && hours > 0 ? hours : 0,
      quality: log?.quality,
    };
  });

  const logged = days.filter((d) => d.hours > 0);
  if (logged.length === 0) return { days, nights: 0, avgHours: 0, avgQuality: null };

  const avgHours = Math.round((logged.reduce((s, d) => s + d.hours, 0) / logged.length) * 10) / 10;
  const meanScore = logged.reduce((s, d) => s + scoreOf(d.quality), 0) / logged.length;
  return {
    days,
    nights: logged.length,
    avgHours,
    avgQuality: QUALITIES[Math.round(meanScore) - 1],
  };
}

// "from 5 nights" / "from 1 night", "מתוך 5 לילות" / "מתוך לילה אחד"
export function nightsLabel(n, isHe) {
  const one = Number(n) === 1;
  if (isHe) return one ? 'מתוך לילה אחד' : `מתוך ${n} לילות`;
  return one ? 'from 1 night' : `from ${n} nights`;
}
