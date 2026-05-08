const Progression = require('../models/Progression');

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
    // 100, 220, 360, 520
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

// Recalculate streak from actual workout documents (after delete)
async function recalcStreak(userId, workouts) {
  const prog = await getProgression(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(checkDate);
    const dayEnd = new Date(checkDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const hasWorkout = workouts.some(
      (w) => new Date(w.date) >= dayStart && new Date(w.date) < dayEnd
    );

    if (hasWorkout) {
      streak++;
    } else if (i > 0) {
      break;
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }

  prog.currentStreak = streak;
  if (streak === 0) {
    prog.lastActivityDate = null;
  }
  // Don't reduce longestStreak - that's a historical record
  await prog.save();
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
async function revokeXP(userId, eventType) {
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (prog.dailyFlags.date && new Date(prog.dailyFlags.date).getTime() === today.getTime()) {
    if (eventType === 'calorie_goal') prog.dailyFlags.calorieGoalMet = false;
    if (eventType === 'protein_goal') prog.dailyFlags.proteinGoalMet = false;
  }

  await prog.save();
}

// Update streak based on activity date
async function updateStreak(userId) {
  const prog = await getProgression(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = prog.lastActivityDate ? new Date(prog.lastActivityDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  if (lastDate && lastDate.getTime() === today.getTime()) {
    // Already counted today
    return prog;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastDate && lastDate.getTime() === yesterday.getTime()) {
    // Consecutive day
    prog.currentStreak += 1;
  } else if (!lastDate || lastDate.getTime() < yesterday.getTime()) {
    // Streak broken or first activity
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
async function checkNutritionGoals(userId, todayNutrition, targets) {
  const prog = await getProgression(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset daily flags if new day
  if (!prog.dailyFlags.date || new Date(prog.dailyFlags.date).getTime() !== today.getTime()) {
    prog.dailyFlags = { date: today, workoutDone: false, calorieGoalMet: false, proteinGoalMet: false };
  }

  const results = [];

  // Check calorie goal (within 90%-110% of target)
  if (!prog.dailyFlags.calorieGoalMet && targets.calorieTarget) {
    const ratio = todayNutrition.totalCalories / targets.calorieTarget;
    if (ratio >= 0.9 && ratio <= 1.1) {
      prog.dailyFlags.calorieGoalMet = true;
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
// the bonus tier (defaults to recommendedMin + 1).
async function checkSleepGoal(userId, hours, recommendedMin, recommendedTarget) {
  const prog = await getProgression(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset daily flags if new day
  if (!prog.dailyFlags.date || new Date(prog.dailyFlags.date).getTime() !== today.getTime()) {
    prog.dailyFlags = { date: today, workoutDone: false, calorieGoalMet: false, proteinGoalMet: false, sleepGoalMet: false };
  }

  if (prog.dailyFlags.sleepGoalMet) {
    await prog.save();
    return [];
  }

  // Increment total sleep logs
  prog.totalSleepLogs = (prog.totalSleepLogs || 0) + 1;

  const greatThreshold = recommendedTarget || recommendedMin + 1;
  const results = [];

  if (hours >= greatThreshold) {
    // Bonus tier — solid full night's sleep
    prog.dailyFlags.sleepGoalMet = true;
    prog.sleepStreak = (prog.sleepStreak || 0) + 1;
    const r = awardXPInternal(prog, 'sleep_great');
    results.push(r);
  } else if (hours >= recommendedMin) {
    // Hit the minimum
    prog.dailyFlags.sleepGoalMet = true;
    prog.sleepStreak = (prog.sleepStreak || 0) + 1;
    const r = awardXPInternal(prog, 'sleep_goal');
    results.push(r);
  } else {
    // Below minimum — reset sleep streak
    prog.sleepStreak = 0;
  }

  await prog.save();
  return results;
}

// Build full status response
async function getProgressionStatus(userId, goalData) {
  const prog = await getProgression(userId);

  // Save initial weight delta on first calculation if not set
  if (goalData?.weightProgress && !prog.initialWeightDelta) {
    prog.initialWeightDelta = Math.abs(goalData.weightProgress.weightDelta);
  }

  // Recalculate stats with real goal data
  prog.stats = calculateStats(prog, goalData);
  await prog.save();

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
    currentStreak: prog.currentStreak,
    longestStreak: prog.longestStreak,
    weekStreaksCompleted: prog.weekStreaksCompleted,
    stats: prog.stats,
    badges: prog.badges,
    recentXP: prog.xpHistory.slice(-10).reverse(),
    sleepStreak: prog.sleepStreak || 0,
    totalSleepLogs: prog.totalSleepLogs || 0,
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
  updateStreak,
  checkNutritionGoals,
  checkSleepGoal,
  getProgressionStatus,
  getProgression,
  BADGES,
};
