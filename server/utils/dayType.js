// Training day vs rest day.
//
// The plan has no fixed calendar (its "day A / day B" are ordinals), so training
// weekdays are derived from workoutsPerWeek, spread evenly through the week
// (Sunday = 0). A day also counts as a training day if the user has already
// trained today, whatever the schedule says.
//
// Calories: a training day gets a little more, a rest day a little less, and the
// weekly AVERAGE stays equal to the usual daily target:
//   n·(1+gain) + (7−n)·(1−drop) = 7     →  gain = drop·(7−n)/n
// The rest-day cut is capped at 15 % and the training-day bonus at 6 %.
// Only the daily/weekly menu uses the adjusted number; the streak, XP and the
// progress ring keep using the plain target.
const { resolveTz } = require('./dates');

const MAX_GAIN = 0.06;
const MAX_DROP = 0.15;

// Evenly spread training weekdays for n sessions a week.
const SCHEDULES = {
  1: [3],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

function trainingWeekdays(workoutsPerWeek) {
  const n = Math.round(Number(workoutsPerWeek));
  if (!Number.isFinite(n) || n < 1) return [];
  return SCHEDULES[Math.min(7, n)];
}

// 0 = Sunday … 6 = Saturday, in the user's timezone.
function weekdayInTz(tz, ref = new Date()) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: resolveTz(tz), weekday: 'short' }).format(ref);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

// { gain, drop } as fractions; both 0 when there is nothing to balance
// (no workouts planned, or training every day).
function calorieShifts(workoutsPerWeek) {
  const n = trainingWeekdays(workoutsPerWeek).length;
  if (n === 0 || n >= 7) return { gain: 0, drop: 0 };
  let drop = Math.min(MAX_DROP, MAX_GAIN * n / (7 - n));
  let gain = drop * (7 - n) / n;
  if (gain > MAX_GAIN) { gain = MAX_GAIN; drop = gain * n / (7 - n); }
  return { gain, drop };
}

// → { type: 'training'|'rest', calories, deltaPct, trainingWeekdays, scheduled }
function dayTypeFor({ profile, baseCalories, workedOutToday = false, now = new Date() }) {
  const days = trainingWeekdays(profile?.workoutsPerWeek);
  const scheduled = days.includes(weekdayInTz(profile?.timezone, now));
  const type = scheduled || workedOutToday ? 'training' : 'rest';
  const { gain, drop } = calorieShifts(profile?.workoutsPerWeek);
  const factor = type === 'training' ? 1 + gain : 1 - drop;
  return {
    type,
    scheduled,
    calories: Math.round(baseCalories * factor),
    deltaPct: Math.round((factor - 1) * 1000) / 10,
    trainingWeekdays: days,
  };
}

module.exports = { trainingWeekdays, weekdayInTz, calorieShifts, dayTypeFor };
