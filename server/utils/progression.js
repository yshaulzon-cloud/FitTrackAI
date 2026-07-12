const Progression = require('../models/Progression');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Sleep = require('../models/Sleep');
const { startOfUserDay, startOfUserDayOffset } = require('./dates');

// ── XP Rewards ──────────────────────────────────────────
const XP_REWARDS = {
  workout: 50,
  calorie_goal: 30,
  protein_goal: 20,
  streak_day: 20,
  streak_week: 200,
  sleep_goal: 25,        // hit minimum recommendation
  sleep_great: 35,       // hit recommended (within band) — bonus tier
};

// ── Level Formula ───────────────────────────────────────
// Levels 1-5:   easy   — base 100, grows slowly
// Levels 6-15:  medium — steeper curve
// Levels 16+:   hard   — exponential feel
function xpForLevel(level) {
  if (level <= 1) return 0;
  if (level <= 5) {
    // levels 2-5 need: 100, 240, 420, 640
    return Math.round(100 * (level - 1) + 20 * (level - 1) * (level - 2));
  }
  if (level <= 15) {
    // Builds on level 5 threshold (520), quadratic growth
    const base = xpForLevel(5);
    const n = level - 5;
    return Math.round(base + 200 * n + 40 * n * n);
  }
  // 16+: exponential-ish
  const base = xpForLevel(15);
  const n = level - 15;
  return Math.round(base + 500 * n + 80 * n * n);
}

// XP needed from current level to next
function xpToNextLevel(level) {
  return xpForLevel(level + 1) - xpForLevel(level);
}

// Calculate level from total XP
function levelFromXP(totalXP) {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

// ── Badge Definitions ───────────────────────────────────
const BADGES = [
  // Workout milestones
  { id: 'first_workout', condition: (p) => p.xpHistory.filter(e => e.type === 'workout').length >= 1 },
  { id: 'workout_10', condition: (p) => p.xpHistory.filter(e => e.type === 'workout').length >= 10 },
  { id: 'workout_50', condition: (p) => p.xpHistory.filter(e => e.type === 'workout').length >= 50 },
  { id: 'workout_100', condition: (p) => p.xpHistory.filter(e => e.type === 'workout').length >= 100 },

  // Streak milestones
  { id: 'streak_3', condition: (p) => p.longestStreak >= 3 },
  { id: 'streak_7', condition: (p) => p.longestStreak >= 7 },
  { id: 'streak_14', condition: (p) => p.longestStreak >= 14 },
  { id: 'streak_30', condition: (p) => p.longestStreak >= 30 },

  // Level milestones
  { id: 'level_5', condition: (p) => p.level >= 5 },
  { id: 'level_10', condition: (p) => p.level >= 10 },
  { id: 'level_20', condition: (p) => p.level >= 20 },

  // Nutrition
  { id: 'nutrition_streak_7', condition: (p) => p.weekStreaksCompleted >= 1 },
  { id: 'nutrition_streak_4', condition: (p) => p.weekStreaksCompleted >= 4 },

  // XP milestones
  { id: 'xp_1000', condition: (p) => p.totalXP >= 1000 },
  { id: 'xp_5000', condition: (p) => p.totalXP >= 5000 },
  { id: 'xp_10000', condition: (p) => p.totalXP >= 10000 },

  // ── 14 New Badges ──
  // Workout milestones continued
  { id: 'workout_25', condition: (p) => p.xpHistory.filter(e => e.type === 'workout').length >= 25 },
  { id: 'workout_200', condition: (p) => p.xpHistory.filter(e => e.type === 'workout').length >= 200 },

  // Streak milestones continued
  { id: 'streak_60', condition: (p) => p.longestStreak >= 60 },
  { id: 'streak_100', condition: (p) => p.longestStreak >= 100 },

  // Level milestones continued
  { id: 'level_3', condition: (p) => p.level >= 3 },
  { id: 'level_15', condition: (p) => p.level >= 15 },
  { id: 'level_30', condition: (p) => p.level >= 30 },

  // Nutrition continued
  { id: 'nutrition_streak_8', condition: (p) => p.weekStreaksCompleted >= 8 },
  { id: 'nutrition_streak_12', condition: (p) => p.weekStreaksCompleted >= 12 },
  { id: 'first_calorie_goal', condition: (p) => p.xpHistory.some(e => e.type === 'calorie_goal') },
  { id: 'first_protein_goal', condition: (p) => p.xpHistory.some(e => e.type === 'protein_goal') },

  // XP milestones continued
  { id: 'xp_500', condition: (p) => p.totalXP >= 500 },
  { id: 'xp_2500', condition: (p) => p.totalXP >= 2500 },
  { id: 'xp_25000', condition: (p) => p.totalXP >= 25000 },

  // Sleep badges
  { id: 'first_sleep', condition: (p) => (p.totalSleepLogs || 0) >= 1 },
  { id: 'sleep_7', condition: (p) => (p.sleepStreak || 0) >= 7 },
  { id: 'sleep_14', condition: (p) => (p.sleepStreak || 0) >= 14 },
  { id: 'sleep_30', condition: (p) => (p.sleepStreak || 0) >= 30 },
  { id: 'sleep_logs_30', condition: (p) => (p.totalSleepLogs || 0) >= 30 },
  { id: 'sleep_logs_100', condition: (p) => (p.totalSleepLogs || 0) >= 100 },
];

// ── Stat Calculations ───────────────────────────────────
// Stats are goal-based percentages based on real user targets
function calculateStats(progression, goalData) {
  const { workoutsPerWeek, workoutsThisWeek, weightProgress } = goalData || {};

  // Discipline (משמעת אימונים): % of weekly workout target met
  const target = workoutsPerWeek || 4;
  const done = workoutsThisWeek || 0;
  const discipline = Math.min(100, Math.round((done / target) * 100));

  // Strength (חוזק): slow build from total workouts + streak + level
  const history = progression.xpHistory || [];
  const allWorkouts = history.filter(e => e.type === 'workout').length;
  const streakBonus = Math.min(15, progression.currentStreak);
  const levelBonus = Math.min(35, Math.round(progression.level * 1.5));
  const workoutBonus = Math.min(50, Math.round(allWorkouts * 0.5));
  const strength = Math.min(100, streakBonus + levelBonus + workoutBonus);

  // Recovery (התאוששות): % progress from initial weight delta toward target.
  let recovery = 100;
  if (weightProgress && weightProgress.weightDelta !== 0) {
    const initialDelta = progression.initialWeightDelta || Math.abs(weightProgress.weightDelta);
    const currentDelta = Math.abs(weightProgress.weightDelta);
    const closed = initialDelta - currentDelta;
    recovery = initialDelta > 0 ? Math.min(100, Math.max(0, Math.round((closed / initialDelta) * 100))) : 100;
  }

  // Sleep (שינה): consistency stat — sleep streak (capped at 7 days = 70%)
  // plus a slow-build bonus from total nights logged (30 logs = 30%).
  // 7-day perfect streak with 30+ logs = 100%.
  const sleepStreakScore = Math.min(70, (progression.sleepStreak || 0) * 10);
  const sleepLogBonus    = Math.min(30, (progression.totalSleepLogs || 0) * 1);
  const sleep = Math.min(100, sleepStreakScore + sleepLogBonus);

  return { discipline, strength, recovery, sleep };
}

// Recalculate the general-activity streak from real workout/meal/sleep
// history (called after a delete, since currentStreak is otherwise only
// ever updated lazily by updateStreak()). Mirrors updateStreak()'s own
// definition of "activity" — workout, meal log, or sleep log all count.
async function recalcStreak(userId, tz) {
  const prog = await getProgression(userId);
  const today = startOfUserDay(tz);
  const windowStart = startOfUserDayOffset(tz, -365);

  const [workouts, nutritionLogs, sleepLogs] = await Promise.all([
    Workout.find({ userId, date: { $gte: windowStart } }, { date: 1 }).lean(),
    Nutrition.find({ userId, date: { $gte: windowStart }, 'meals.0': { $exists: true } }, { date: 1 }).lean(),
    Sleep.find({ userId, date: { $gte: windowStart } }, { date: 1 }).lean(),
  ]);

  // Bucket every activity into the user's local calendar day.
  const activeDays = new Set();
  for (const doc of [...workouts, ...nutritionLogs, ...sleepLogs]) {
    activeDays.add(startOfUserDay(tz, new Date(doc.date)).getTime());
  }

  let streak = 0;
  let lastActive = null;

  // Walk backwards one local calendar day at a time (DST-safe via startOfUserDayOffset).
  for (let i = 0; i < 365; i++) {
    const checkDate = startOfUserDayOffset(tz, -i, today);
    if (activeDays.has(checkDate.getTime())) {
      streak++;
      if (!lastActive) lastActive = new Date(checkDate);
    } else if (i > 0) {
      break;
    }
  }

  prog.currentStreak = streak;
  prog.lastActivityDate = lastActive;
  // Don't reduce longestStreak - that's a historical record
  await prog.save();
}

// After deleting a workout/meal, the day that just lost its last qualifying
// activity may have already been paid streak_day (and streak_week) XP by
// updateStreak() earlier today. If today no longer has ANY qualifying
// activity, undo that XP — otherwise logging + deleting an entry becomes a
// free-XP loop, and totalXP/level stay inflated relative to the (correctly
// recalculated) streak.
async function reconcileStreakForToday(userId, tz) {
  const prog = await getProgression(userId);
  const today = startOfUserDay(tz);
  const lastDate = prog.lastActivityDate ? startOfUserDay(tz, new Date(prog.lastActivityDate)) : null;
  // Streak XP wasn't granted today — nothing to reconcile.
  if (!lastDate || lastDate.getTime() !== today.getTime()) return;

  const dayEnd = startOfUserDayOffset(tz, 1, today);
  const [hasWorkout, hasMeal, hasSleep] = await Promise.all([
    Workout.exists({ userId, date: { $gte: today, $lt: dayEnd } }),
    Nutrition.exists({ userId, date: { $gte: today, $lt: dayEnd }, 'meals.0': { $exists: true } }),
    Sleep.exists({ userId, date: { $gte: today, $lt: dayEnd } }),
  ]);
  if (hasWorkout || hasMeal || hasSleep) return; // today still qualifies

  // Only revoke bonuses that were actually granted *today* — decide by the XP
  // event dates, not by currentStreak % 7 (which can be a multiple of 7 for a
  // milestone reached on a previous day; see audit #8).
  const grantedToday = (type) => prog.xpHistory.some(
    (e) => e.type === type && startOfUserDay(tz, new Date(e.date)).getTime() === today.getTime()
  );
  const hadDayXP = grantedToday('streak_day');
  const hadWeekBonus = grantedToday('streak_week');

  if (hadDayXP) await revokeXP(userId, 'streak_day');
  if (hadWeekBonus) {
    await revokeXP(userId, 'streak_week');
    const p2 = await getProgression(userId);
    p2.weekStreaksCompleted = Math.max(0, p2.weekStreaksCompleted - 1);
    await p2.save();
  }
}

// ── Core Functions ──────────────────────────────────────

// Get or create progression record for a user
async function getProgression(userId) {
  let prog = await Progression.findOne({ userId });
  if (!prog) {
    prog = await Progression.create({ userId });
  }
  return prog;
}

// Award XP and handle level-ups, streaks, badges
async function awardXP(userId, eventType) {
  const prog = await getProgression(userId);
  const xpAmount = XP_REWARDS[eventType];
  if (!xpAmount) return prog;

  const oldLevel = prog.level;

  // Add XP
  prog.totalXP += xpAmount;

  // Add to history (keep last 50)
  prog.xpHistory.push({ type: eventType, amount: xpAmount, date: new Date() });
  if (prog.xpHistory.length > 50) {
    prog.xpHistory = prog.xpHistory.slice(-50);
  }

  // Calculate new level
  prog.level = levelFromXP(prog.totalXP);

  // Update stats
  prog.stats = calculateStats(prog);

  // Check for new badges
  const newBadges = [];
  const earnedIds = new Set(prog.badges.map(b => b.id));
  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.condition(prog)) {
      const newBadge = { id: badge.id, unlockedAt: new Date() };
      prog.badges.push(newBadge);
      newBadges.push(newBadge);
    }
  }

  await prog.save();

  // Return level-up info
  const leveledUp = prog.level > oldLevel;
  return {
    xpGained: xpAmount,
    eventType,
    totalXP: prog.totalXP,
    level: prog.level,
    leveledUp,
    oldLevel: leveledUp ? oldLevel : null,
    newBadges,
    xpForCurrentLevel: xpForLevel(prog.level),
    xpForNextLevel: xpForLevel(prog.level + 1),
    stats: prog.stats,
  };
}

// Revoke XP when an action is undone (workout/meal deleted)
async function revokeXP(userId, eventType, tz) {
  const prog = await getProgression(userId);
  const xpAmount = XP_REWARDS[eventType];
  if (!xpAmount) return;

  prog.totalXP = Math.max(0, prog.totalXP - xpAmount);

  // Remove most recent matching event from history
  const idx = prog.xpHistory.map(e => e.type).lastIndexOf(eventType);
  if (idx !== -1) {
    prog.xpHistory.splice(idx, 1);
  }

  // Recalculate level and stats
  prog.level = levelFromXP(prog.totalXP);
  prog.stats = calculateStats(prog);

  // Reset daily flag if applicable
  const today = startOfUserDay(tz);
  if (prog.dailyFlags.date && startOfUserDay(tz, new Date(prog.dailyFlags.date)).getTime() === today.getTime()) {
    if (eventType === 'calorie_goal') prog.dailyFlags.calorieGoalMet = false;
    if (eventType === 'protein_goal') prog.dailyFlags.proteinGoalMet = false;
  }

  await prog.save();
}

// Update the general activity streak — consecutive calendar days on which
// the user did *anything* trackable (workout, meal log, or sleep log).
// This is deliberately not workout-specific; see checkNutritionGoals for
// the separate calorie-goal streak.
async function updateStreak(userId, tz) {
  const prog = await getProgression(userId);
  const today = startOfUserDay(tz);

  const lastDate = prog.lastActivityDate ? startOfUserDay(tz, new Date(prog.lastActivityDate)) : null;

  // Already counted today, or the record is stamped in the future (clock skew /
  // legacy bad data) — either way, don't award again. Return a uniform shape so
  // callers never have to distinguish a Mongoose doc from a result object (#9).
  if (lastDate && lastDate.getTime() >= today.getTime()) {
    return {
      currentStreak: prog.currentStreak,
      longestStreak: prog.longestStreak,
      leveledUp: false,
      level: prog.level,
      totalXP: prog.totalXP,
      newBadges: [],
      streakDayXP: null,
      streakWeekXP: null,
      alreadyCountedToday: true,
    };
  }

  const yesterday = startOfUserDayOffset(tz, -1, today);

  if (lastDate && lastDate.getTime() === yesterday.getTime()) {
    // Consecutive day
    prog.currentStreak += 1;
  } else {
    // Streak broken or first activity (lastDate is null or older than yesterday)
    prog.currentStreak = 1;
  }

  prog.lastActivityDate = today;

  if (prog.currentStreak > prog.longestStreak) {
    prog.longestStreak = prog.currentStreak;
  }

  // Award streak day XP
  const streakResult = await saveAndAwardStreak(prog);
  return streakResult;
}

async function saveAndAwardStreak(prog) {
  // Award daily streak XP
  const result = { streakDayXP: null, streakWeekXP: null };

  prog.totalXP += XP_REWARDS.streak_day;
  prog.xpHistory.push({ type: 'streak_day', amount: XP_REWARDS.streak_day, date: new Date() });
  if (prog.xpHistory.length > 50) {
    prog.xpHistory = prog.xpHistory.slice(-50);
  }
  result.streakDayXP = XP_REWARDS.streak_day;

  // Check for weekly streak bonus (every 7 days)
  if (prog.currentStreak > 0 && prog.currentStreak % 7 === 0) {
    prog.totalXP += XP_REWARDS.streak_week;
    prog.xpHistory.push({ type: 'streak_week', amount: XP_REWARDS.streak_week, date: new Date() });
    if (prog.xpHistory.length > 50) {
      prog.xpHistory = prog.xpHistory.slice(-50);
    }
    prog.weekStreaksCompleted += 1;
    result.streakWeekXP = XP_REWARDS.streak_week;
  }

  const oldLevel = prog.level;
  prog.level = levelFromXP(prog.totalXP);
  prog.stats = calculateStats(prog);

  // Check badges
  const newBadges = [];
  const earnedIds = new Set(prog.badges.map(b => b.id));
  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.condition(prog)) {
      const newBadge = { id: badge.id, unlockedAt: new Date() };
      prog.badges.push(newBadge);
      newBadges.push(newBadge);
    }
  }

  await prog.save();

  return {
    currentStreak: prog.currentStreak,
    longestStreak: prog.longestStreak,
    leveledUp: prog.level > oldLevel,
    level: prog.level,
    totalXP: prog.totalXP,
    newBadges,
    ...result,
  };
}

// Check and award nutrition goals
async function checkNutritionGoals(userId, todayNutrition, targets, tz) {
  const prog = await getProgression(userId);
  const today = startOfUserDay(tz);

  // Reset daily flags if new day
  if (!prog.dailyFlags.date || startOfUserDay(tz, new Date(prog.dailyFlags.date)).getTime() !== today.getTime()) {
    prog.dailyFlags = { date: today, workoutDone: false, calorieGoalMet: false, proteinGoalMet: false };
  }

  const results = [];

  // Check calorie goal (within 90%-110% of target)
  if (!prog.dailyFlags.calorieGoalMet && targets.calorieTarget) {
    const ratio = todayNutrition.totalCalories / targets.calorieTarget;
    if (ratio >= 0.9 && ratio <= 1.1) {
      prog.dailyFlags.calorieGoalMet = true;

      // Calorie-goal streak: consecutive days the target was hit. Separate
      // from currentStreak (general activity) — a user can work out every
      // day and still miss their calorie target, or vice versa.
      const lastGoalDate = prog.lastCalorieGoalDate ? startOfUserDay(tz, new Date(prog.lastCalorieGoalDate)) : null;
      const yesterday = startOfUserDayOffset(tz, -1, today);

      if (lastGoalDate && lastGoalDate.getTime() === yesterday.getTime()) {
        prog.calorieStreak = (prog.calorieStreak || 0) + 1;
      } else {
        prog.calorieStreak = 1;
      }
      prog.lastCalorieGoalDate = today;

      const r = await awardXPInternal(prog, 'calorie_goal');
      results.push(r);
    }
  }

  // Check protein goal (>= 90% of target)
  if (!prog.dailyFlags.proteinGoalMet && targets.macros?.protein) {
    const ratio = todayNutrition.totalProtein / targets.macros.protein;
    if (ratio >= 0.9) {
      prog.dailyFlags.proteinGoalMet = true;
      const r = await awardXPInternal(prog, 'protein_goal');
      results.push(r);
    }
  }

  await prog.save();
  return results;
}

// Internal XP award (operates on existing prog object, doesn't save)
function awardXPInternal(prog, eventType) {
  const xpAmount = XP_REWARDS[eventType];
  const oldLevel = prog.level;

  prog.totalXP += xpAmount;
  prog.xpHistory.push({ type: eventType, amount: xpAmount, date: new Date() });
  if (prog.xpHistory.length > 50) {
    prog.xpHistory = prog.xpHistory.slice(-50);
  }

  prog.level = levelFromXP(prog.totalXP);
  prog.stats = calculateStats(prog);

  const newBadges = [];
  const earnedIds = new Set(prog.badges.map(b => b.id));
  for (const badge of BADGES) {
    if (!earnedIds.has(badge.id) && badge.condition(prog)) {
      const newBadge = { id: badge.id, unlockedAt: new Date() };
      prog.badges.push(newBadge);
      newBadges.push(newBadge);
    }
  }

  return {
    xpGained: xpAmount,
    eventType,
    totalXP: prog.totalXP,
    level: prog.level,
    leveledUp: prog.level > oldLevel,
    newBadges,
  };
}

// Check and award sleep goal XP — tiered:
//   < min:                0 XP, sleepStreak resets
//   min ≤ hours < great:  +25 XP (sleep_goal)
//   hours ≥ great:        +35 XP (sleep_great) — "recommended" tier
// `recommendedMin` is the lower bound (e.g. 7), `recommendedTarget` is
// the bonus tier (defaults to recommendedMin + 1). `isNewLog` must be true
// only the first time a given calendar night is saved — re-saving/editing
// today's existing entry (e.g. correcting the hours) must not double-count
// it as a second night in totalSleepLogs.
async function checkSleepGoal(userId, { hours, recommendedMin, recommendedTarget, isNewLog = true, logDate = new Date(), tz } = {}) {
  const prog = await getProgression(userId);
  const today = startOfUserDay(tz);
  const logDay = startOfUserDay(tz, new Date(logDate));
  const isToday = logDay.getTime() === today.getTime();

  // A genuinely new night's record always counts toward the lifetime total,
  // even if it's a back-filled past date.
  if (isNewLog) {
    prog.totalSleepLogs = (prog.totalSleepLogs || 0) + 1;
  }

  // XP, the daily "sleep goal met" flag, and the sleep streak are all tied to
  // *today's* night only. Back-filling a past date records the log (above) but
  // must never grant today's XP, flip today's flag, or move the streak (#2/#5).
  if (!isToday) {
    await prog.save();
    return [];
  }

  // Reset daily flags if new day
  if (!prog.dailyFlags.date || startOfUserDay(tz, new Date(prog.dailyFlags.date)).getTime() !== today.getTime()) {
    prog.dailyFlags = { date: today, workoutDone: false, calorieGoalMet: false, proteinGoalMet: false, sleepGoalMet: false };
  }

  if (prog.dailyFlags.sleepGoalMet) {
    await prog.save();
    return [];
  }

  const greatThreshold = recommendedTarget || recommendedMin + 1;
  const results = [];

  const qualifies = hours >= recommendedMin;
  if (qualifies) {
    prog.dailyFlags.sleepGoalMet = true;
    // Consecutive-day streak (matches calorieStreak): only +1 if the previous
    // qualifying night was literally yesterday; otherwise it restarts at 1.
    const lastSleep = prog.lastSleepGoalDate ? startOfUserDay(tz, new Date(prog.lastSleepGoalDate)) : null;
    const yesterday = startOfUserDayOffset(tz, -1, today);
    prog.sleepStreak = (lastSleep && lastSleep.getTime() === yesterday.getTime())
      ? (prog.sleepStreak || 0) + 1
      : 1;
    prog.lastSleepGoalDate = today;

    const r = awardXPInternal(prog, hours >= greatThreshold ? 'sleep_great' : 'sleep_goal');
    results.push(r);
  } else {
    // Below minimum tonight — break the sleep streak.
    prog.sleepStreak = 0;
  }

  await prog.save();
  return results;
}

// A streak stored in the DB only ever moves when the user *does* something
// (updateStreak) or deletes something (recalcStreak). For a user who simply
// stops opening the app, `currentStreak` stays frozen at its last value. On
// read we must therefore report the *live* streak: it's only still alive if
// the last activity was today or yesterday (in the user's timezone); otherwise
// it has lapsed and should read as 0 even though the stored number is higher.
function liveStreak(prog, tz) {
  const stored = prog.currentStreak || 0;
  if (stored === 0 || !prog.lastActivityDate) return 0;
  const today = startOfUserDay(tz);
  const yesterday = startOfUserDayOffset(tz, -1, today);
  const last = startOfUserDay(tz, new Date(prog.lastActivityDate));
  return last.getTime() >= yesterday.getTime() ? stored : 0;
}

// Build full status response
async function getProgressionStatus(userId, goalData, tz) {
  const prog = await getProgression(userId);

  // Save initial weight delta on first calculation if not set
  let dirty = false;
  if (goalData?.weightProgress && !prog.initialWeightDelta) {
    prog.initialWeightDelta = Math.abs(goalData.weightProgress.weightDelta);
    dirty = true;
  }

  // Recalculate stats with real goal data. This is a read endpoint, so only
  // persist when something actually changed (#7) — avoids a DB write on every
  // dashboard load and the concurrent-write race that came with it.
  const nextStats = calculateStats(prog, goalData);
  if (JSON.stringify(prog.stats) !== JSON.stringify(nextStats)) {
    prog.stats = nextStats;
    dirty = true;
  }
  if (dirty) await prog.save();

  const currentLevelXP = xpForLevel(prog.level);
  const nextLevelXP = xpForLevel(prog.level + 1);
  const xpInCurrentLevel = prog.totalXP - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;

  return {
    totalXP: prog.totalXP,
    level: prog.level,
    currentLevelXP,
    nextLevelXP,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent: Math.round((xpInCurrentLevel / xpNeededForNext) * 100),
    currentStreak: liveStreak(prog, tz),
    longestStreak: prog.longestStreak,
    weekStreaksCompleted: prog.weekStreaksCompleted,
    stats: nextStats,
    badges: prog.badges,
    recentXP: prog.xpHistory.slice(-10).reverse(),
    sleepStreak: prog.sleepStreak || 0,
    totalSleepLogs: prog.totalSleepLogs || 0,
    calorieStreak: prog.calorieStreak || 0,
    // Snapshot of how far the user was from target weight on first stat-calc.
    // Drives the "journey to goal" visualization on the Goals tab.
    initialWeightDelta: prog.initialWeightDelta || 0,
  };
}

module.exports = {
  XP_REWARDS,
  xpForLevel,
  xpToNextLevel,
  levelFromXP,
  awardXP,
  revokeXP,
  recalcStreak,
  reconcileStreakForToday,
  updateStreak,
  checkNutritionGoals,
  checkSleepGoal,
  getProgressionStatus,
  getProgression,
  BADGES,
};
