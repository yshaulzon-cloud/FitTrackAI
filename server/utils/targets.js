// The one place that turns a profile into calorie / macro targets.
//
// Before this module the TDEE → calorie target → macros sequence was copied into
// nine places (nutrition.js ×5, user.js ×3, targetChange.js), and the menu was
// sized to the training/rest-day number while the ring, the bar and the
// calorie-goal XP compared against the plain number. Now:
//
//   base   the plain daily target (profile only; what Settings shows)
//   today  the target FOR A GIVEN DAY — the base shifted for a training day
//          (+) or a rest day (−), the weekly average unchanged (dayType.js).
//          Menus, the ring, the bar, XP and the streak all use this one.
//
// Macros on a shifted day: protein and fat keep their base grams (protein is set
// per kg of body weight, fat is a floor for hormones); the carbohydrates absorb
// the calorie difference (never below 0), as in ordinary carb cycling.
const { calculateTDEE, calculateCalorieTarget, calculateMacros } = require('./calculations');
const { dayTypeFor } = require('./dayType');
const { startOfUserDay, startOfUserDayOffset } = require('./dates');

// Plain targets from a profile. Throws if the profile is too incomplete to compute.
function baseTargets(profile) {
  const { tdee, ree, formulaUsed } = calculateTDEE(profile);
  const calorieTarget = calculateCalorieTarget(tdee, profile.goal, profile.weight, profile.bodyFatPercentage);
  const macros = calculateMacros(profile.weight, calorieTarget, profile.goal, profile.experience, profile.bodyFatPercentage);
  return { tdee, ree, formulaUsed, calorieTarget, macros };
}

// Macros for a day whose calorie target is `dayCalories`.
function macrosForDay(baseMacros, baseCalories, dayCalories) {
  const carbs = Math.max(0, Math.round(baseMacros.carbs + (dayCalories - baseCalories) / 4));
  const pct = (kcal) => (dayCalories > 0 ? Math.round((kcal / dayCalories) * 100) : 0);
  return {
    ...baseMacros,
    carbs,
    macroPercent: {
      protein: pct(baseMacros.protein * 4),
      carbs: pct(carbs * 4),
      fat: pct(baseMacros.fat * 9),
    },
  };
}

// Pure: the targets for one day.
//   → { base, today, dayType, tdee, ree, formulaUsed }
//   base  { calories, macros }
//   today { calories, protein, carbs, fat, macros }
//   dayType { type: 'training'|'rest', scheduled, deltaPct, trainingWeekdays, workedOutToday }
function getDailyTargets({ profile, workedOutToday = false, now = new Date() }) {
  const b = baseTargets(profile);
  const day = dayTypeFor({ profile, baseCalories: b.calorieTarget, workedOutToday, now });
  const macros = macrosForDay(b.macros, b.calorieTarget, day.calories);
  return {
    tdee: b.tdee,
    ree: b.ree,
    formulaUsed: b.formulaUsed,
    base: { calories: b.calorieTarget, macros: b.macros },
    today: { calories: day.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat, macros },
    dayType: {
      type: day.type,
      scheduled: day.scheduled,
      deltaPct: day.deltaPct,
      trainingWeekdays: day.trainingWeekdays,
      workedOutToday: !!workedOutToday,
    },
  };
}

// What gets stored on a day's Nutrition log (model: targetSnapshot).
function targetSnapshot(t) {
  return {
    calories: t.today.calories,
    protein: t.today.protein,
    carbs: t.today.carbs,
    fat: t.today.fat,
    baseCalories: t.base.calories,
    dayType: t.dayType.type,
  };
}

// Did the user complete a workout on their local calendar day containing `ref`?
async function workedOutOn(userId, tz, ref = new Date()) {
  const Workout = require('../models/Workout'); // lazy: keeps the pure parts usable without Mongoose models loaded
  const start = startOfUserDay(tz, ref);
  const end = startOfUserDayOffset(tz, 1, start);
  return !!(await Workout.exists({ userId, date: { $gte: start, $lt: end } }));
}

// Targets for the user's local today (a workout already logged today makes it a training day).
async function dailyTargetsForUser(user, now = new Date()) {
  const workedOutToday = await workedOutOn(user._id, user.profile?.timezone, now);
  return getDailyTargets({ profile: user.profile, workedOutToday, now });
}

// Targets for each of the next `days` calendar days, starting with the user's local today.
// Day 0 honours a workout already logged today; later days follow the schedule.
// → [{ offset, date (local-midnight Date), ...getDailyTargets() }]
async function weeklyTargetsForUser(user, days = 7, now = new Date()) {
  const tz = user.profile?.timezone;
  const todayStart = startOfUserDay(tz, now);
  const workedOutToday = await workedOutOn(user._id, tz, now);
  const out = [];
  for (let i = 0; i < days; i++) {
    const dayStart = startOfUserDayOffset(tz, i, todayStart);
    // noon of that local day: far from any midnight/DST edge, so the weekday is unambiguous
    const ref = new Date(dayStart.getTime() + 12 * 3600 * 1000);
    out.push({ offset: i, date: dayStart, ...getDailyTargets({ profile: user.profile, workedOutToday: i === 0 && workedOutToday, now: ref }) });
  }
  return out;
}

module.exports = { baseTargets, macrosForDay, getDailyTargets, targetSnapshot, dailyTargetsForUser, weeklyTargetsForUser, workedOutOn };
