const express = require('express');
const { param, query } = require('express-validator');
const auth = require('../middleware/auth');
const Nutrition = require('../models/Nutrition');
const { FOOD_DB, estimator } = require('../utils/calculations');
const { resolveMealEstimate, failureResponse } = require('../utils/mealEstimate');
const { feedbackFor } = require('../utils/logFeedback');
const { checkNutritionGoals, revokeXP, updateStreak, recalcStreak, reconcileStreakForToday } = require('../utils/progression');
const { startOfUserDay, startOfUserDayOffset } = require('../utils/dates');
const { withUserLock } = require('../utils/userLock');
const User = require('../models/User');
const { getRandomMenu, getWeeklyMenu, swapMeal } = require('../data/mealPlans');
const { withItems, withItemsForMenu } = require('../utils/mealItems');
// One source for every target: the ring, the bar, XP and the menus all read the
// same per-day numbers (see utils/targets.js).
const { dailyTargetsForUser, weeklyTargetsForUser, targetSnapshot } = require('../utils/targets');

const router = express.Router();

// POST /nutrition/log
// A suggested-menu meal sends its own exact totals; a typed meal is read by the
// food engine (utils/mealEstimate.js). A text that names no known food is NOT
// saved as a made-up 350 kcal meal: the answer is 422 FOOD_NOT_FOUND, nothing is
// added to the day, the ring or XP, and the app offers the search or a hand-typed
// entry (body.nutrition with source 'manual', 400 INVALID_VALUES when unusable).
router.post('/log', auth, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Meal description is required', messageHe: 'יש להזין תיאור של הארוחה' });
    }
    if (description.length > 500) {
      return res.status(400).json({ message: 'Description too long (max 500 chars)', messageHe: 'תיאור ארוך מדי (מקסימום 500 תווים)' });
    }

    const { estimated, reason } = resolveMealEstimate(description, req.body.nutrition);
    if (!estimated) {
      const failure = failureResponse(reason);
      return res.status(failure.status).json(failure.body);
    }

    const tz = req.user.profile?.timezone;
    // Find today's (user-local) nutrition log or create one
    const today = startOfUserDay(tz);
    const tomorrow = startOfUserDayOffset(tz, 1, today);

    const meal = {
      description: description.trim(),
      ...estimated,
      time: new Date(),
    };

    // Today's target — the one number the ring, the bar, the menu and XP all use.
    // Also stored on the day's log so history compares a past day with the target
    // that applied then. null when the profile is incomplete (nothing to compare to).
    let targets = null;
    try {
      const user = await User.findById(req.userId);
      if (user?.profile && user.onboardingComplete) targets = await dailyTargetsForUser(user);
    } catch (targetErr) {
      console.error('Target error:', targetErr.message);
    }
    const snapshot = targets ? targetSnapshot(targets) : null;

    // Serialize the DB mutation + XP + streak so a concurrent log/delete for
    // the same user can't interleave (audit #6).
    const { nutritionLog, xpResults } = await withUserLock(req.userId, async () => {
      let nutritionLog = await Nutrition.findOne({
        userId: req.userId,
        date: { $gte: today, $lt: tomorrow },
      });

      if (nutritionLog) {
        nutritionLog.meals.push(meal);
        nutritionLog.totalCalories += estimated.calories;
        nutritionLog.totalProtein += estimated.protein;
        nutritionLog.totalCarbs += estimated.carbs;
        nutritionLog.totalFat += estimated.fat;
        nutritionLog.totalFiber = (nutritionLog.totalFiber || 0) + (estimated.fiber || 0);
        if (snapshot) nutritionLog.targetSnapshot = snapshot; // the latest state of the day wins (a workout can flip rest → training)
        await nutritionLog.save();
      } else {
        nutritionLog = await Nutrition.create({
          userId: req.userId,
          date: today,
          meals: [meal],
          totalCalories: estimated.calories,
          totalProtein: estimated.protein,
          totalCarbs: estimated.carbs,
          totalFat: estimated.fat,
          totalFiber: estimated.fiber || 0,
          targetSnapshot: snapshot,
        });
      }

      // Check nutrition goals for XP + count today toward the general
      // activity streak (logging a meal counts as "showing up" for the day,
      // same as a workout or a sleep entry).
      let xpResults = [];
      try {
        if (targets) {
          xpResults = await checkNutritionGoals(req.userId, nutritionLog, { calorieTarget: targets.today.calories, macros: targets.today.macros }, tz);
        }
        await updateStreak(req.userId, tz);
      } catch (xpErr) {
        console.error('XP check error:', xpErr.message);
      }

      return { nutritionLog, xpResults };
    });

    const daily = {
      totalCalories: nutritionLog.totalCalories,
      totalProtein: nutritionLog.totalProtein,
      totalCarbs: nutritionLog.totalCarbs,
      totalFat: nutritionLog.totalFat,
      totalFiber: nutritionLog.totalFiber || 0,
    };
    // `meal` also carries what the engine read (items, quantityAssumed, unmatched) so the
    // app can say "assumed 100 g" / "didn't recognise X". target / remaining / dayType
    // tell the app where the day stands against today's target (null if no target).
    res.status(201).json({ meal, daily, ...feedbackFor(daily, targets), xp: xpResults });
  } catch (error) {
    console.error('Nutrition log error:', error);
    res.status(500).json({ message: 'Error saving meal', messageHe: 'שגיאה בשמירת הארוחה' });
  }
});

// DELETE /nutrition/meal/:mealId
router.delete('/meal/:mealId', auth, param('mealId').isMongoId(), async (req, res) => {
  try {
    const tz = req.user.profile?.timezone;
    const today = startOfUserDay(tz);
    const tomorrow = startOfUserDayOffset(tz, 1, today);

    const result = await withUserLock(req.userId, async () => {
      const nutritionLog = await Nutrition.findOne({
        userId: req.userId,
        date: { $gte: today, $lt: tomorrow },
      });

      if (!nutritionLog) {
        return { status: 404, body: { message: 'No nutrition log found' } };
      }

      const meal = nutritionLog.meals.id(req.params.mealId);
      if (!meal) {
        return { status: 404, body: { message: 'Meal not found' } };
      }

      // Subtract meal values from totals
      nutritionLog.totalCalories -= meal.calories;
      nutritionLog.totalProtein -= meal.protein;
      nutritionLog.totalCarbs -= meal.carbs;
      nutritionLog.totalFat -= meal.fat;
      nutritionLog.totalFiber = (nutritionLog.totalFiber || 0) - (meal.fiber || 0);

      // Remove the meal
      nutritionLog.meals.pull(req.params.mealId);
      await nutritionLog.save();

      // Revoke nutrition XP if goals no longer met after deletion
      let targets = null;
      try {
        const user = await User.findById(req.userId);
        if (user?.profile && user.onboardingComplete) {
          const t = await dailyTargetsForUser(user);
          targets = t;
          const calRatio = nutritionLog.totalCalories / t.today.calories;
          if (calRatio < 0.9 || calRatio > 1.1) {
            await revokeXP(req.userId, 'calorie_goal', tz);
          }
          const protRatio = nutritionLog.totalProtein / (t.today.protein || 1);
          if (protRatio < 0.9) {
            await revokeXP(req.userId, 'protein_goal', tz);
          }
        }
        // This route only ever touches today's log, so if that was the day's
        // last meal, today may no longer qualify for the activity streak —
        // must run before recalcStreak (see progression.js for why).
        if (nutritionLog.meals.length === 0) {
          await reconcileStreakForToday(req.userId, tz);
          await recalcStreak(req.userId, tz);
        }
      } catch (xpErr) {
        console.error('XP revoke error:', xpErr.message);
      }

      const daily = {
        totalCalories: nutritionLog.totalCalories,
        totalProtein: nutritionLog.totalProtein,
        totalCarbs: nutritionLog.totalCarbs,
        totalFat: nutritionLog.totalFat,
        totalFiber: nutritionLog.totalFiber || 0,
      };
      return { status: 200, body: { message: 'Meal deleted', daily, ...feedbackFor(daily, targets) } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ message: 'Error deleting meal' });
  }
});

// GET /nutrition/today
router.get('/today', auth, async (req, res) => {
  try {
    const tz = req.user.profile?.timezone;
    const today = startOfUserDay(tz);
    const tomorrow = startOfUserDayOffset(tz, 1, today);

    const nutritionLog = await Nutrition.findOne({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!nutritionLog) {
      return res.json({
        meals: [],
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
      });
    }

    // Returned exactly as stored. (This used to re-run the food engine on every load to
    // fill in a missing English name — slow, and a changed engine could attach a name that
    // no longer matches what was logged. The app shows the description when there is none.)
    res.json(nutritionLog.toObject());
  } catch (error) {
    console.error('Nutrition today error:', error);
    res.status(500).json({ message: 'Error loading nutrition data', messageHe: 'שגיאה בטעינת נתוני תזונה' });
  }
});

// GET /nutrition/history
router.get('/history', auth, async (req, res) => {
  try {
    const logs = await Nutrition.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(30);

    res.json(logs);
  } catch (error) {
    console.error('Nutrition history error:', error);
    res.status(500).json({ message: 'Error loading nutrition history', messageHe: 'שגיאה בטעינת היסטוריית תזונה' });
  }
});

// GET /nutrition/search?q= — live matches from FOOD_DB for the search-as-you-
// type list. Values are per 100 g exactly as stored. `serving` is the weight of one
// natural portion (an egg, a pita, a glass of milk) when the portions table knows it,
// else null — the app starts its quantity picker there (100 g when null) and works
// out the numbers for the chosen weight itself.
router.get(
  '/search',
  auth,
  [query('q').isString().trim().isLength({ min: 1, max: 60 })],
  async (req, res) => {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    if (!q) return res.json({ results: [] });
    const he = /[֐-׿]/.test(q);
    const scored = [];
    for (const item of FOOD_DB) {
      // Rank the entry by its best-matching key: exact > prefix > substring.
      let best = 0;
      for (const key of item.keys) {
        const k = key.toLowerCase();
        if (k === q) { best = Math.max(best, 3); break; }
        if (k.startsWith(q)) best = Math.max(best, 2);
        else if (k.includes(q)) best = Math.max(best, 1);
      }
      if (best === 0) continue;
      // Show a label in the query's language when the entry has one.
      const heKey = item.keys.find((k) => /[֐-׿]/.test(k));
      const enKey = item.keys.find((k) => !/[֐-׿]/.test(k));
      const label = (he ? heKey : enKey) || item.keys[0];
      // Per 100 g, exactly as stored (fb = fibre). The client shows the basis.
      const portion = estimator.portionOf(item);
      scored.push({
        score: best, name: label, nameHe: heKey || null, nameEn: enKey || null,
        cal: item.cal, p: item.p, c: item.c, f: item.f, fb: item.fb || 0, basis: 'per100g',
        serving: portion && portion.serving > 0 ? portion.serving : null,
      });
    }
    scored.sort((a, b) => b.score - a.score || a.name.length - b.name.length);
    res.json({ results: scored.slice(0, 8).map(({ score, ...r }) => r) });
  },
);

// GET /nutrition/day-type — training day / rest day for the user's local today,
// with today's target (the base shifted so the weekly average is unchanged, see
// utils/dayType.js and utils/targets.js). The first four fields keep their old
// names; `targets` adds the macros and the plain base for the client.
router.get('/day-type', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.profile || !user.onboardingComplete) {
      return res.status(400).json({ message: 'Profile not complete' });
    }
    const t = await dailyTargetsForUser(user);
    res.json({
      type: t.dayType.type,
      scheduled: t.dayType.scheduled,
      calories: t.today.calories,
      deltaPct: t.dayType.deltaPct,
      trainingWeekdays: t.dayType.trainingWeekdays,
      workedOutToday: t.dayType.workedOutToday,
      baseCalories: t.base.calories,
      targets: { today: t.today, base: t.base },
    });
  } catch (error) {
    console.error('Day type error:', error);
    res.status(500).json({ message: 'Error getting day type' });
  }
});

router.get('/daily-menu', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.profile || !user.onboardingComplete) {
      return res.status(400).json({ message: 'Profile not complete' });
    }

    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId) : null;

    // Today's menu is sized for today's target: a bit more on a training day, a
    // bit less on a rest day (weekly average unchanged) — the same number the
    // ring, the bar and the calorie-goal XP use.
    const t = await dailyTargetsForUser(user);
    const menu = getRandomMenu(t.today.calories, excludeId, t.today.protein, { carbs: t.today.carbs, fat: t.today.fat });
    if (!menu) {
      return res.status(404).json({ message: 'No menu found' });
    }

    // `items` = per-food nutrition for each meal (shares of the meal's totals).
    // `target` = the day's targets this menu was sized for; the client shows the
    // gap to it and notices when it stops applying (new day, new target).
    res.json({
      menu: {
        ...withItemsForMenu(menu),
        target: { calories: t.today.calories, protein: t.today.protein, carbs: t.today.carbs, fat: t.today.fat },
      },
      calorieTarget: t.today.calories,
      baseCalorieTarget: t.base.calories,
      dayType: { type: t.dayType.type, deltaPct: t.dayType.deltaPct },
      proteinTarget: t.today.protein,
    });
  } catch (error) {
    console.error('Daily menu error:', error);
    res.status(500).json({ message: 'Error getting daily menu' });
  }
});

// GET /nutrition/weekly-menu - Get a suggested 7-day menu based on calorie target
router.get('/weekly-menu', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.profile || !user.onboardingComplete) {
      return res.status(400).json({ message: 'Profile not complete' });
    }

    // Day i of the weekly menu is the calendar day today + i, sized to THAT day's
    // target (training / rest), exactly as the daily menu is for today.
    const week = await weeklyTargetsForUser(user, 7);
    const days = getWeeklyMenu(
      week.map((w) => w.today.calories),
      week.map((w) => w.today.protein),
      week.map((w) => ({ carbs: w.today.carbs, fat: w.today.fat })),
    );
    if (!days.length) {
      return res.status(404).json({ message: 'No weekly menu found' });
    }

    const dayTargets = week.map((w) => ({
      offset: w.offset,
      date: w.date,
      calories: w.today.calories,
      protein: w.today.protein,
      carbs: w.today.carbs,
      fat: w.today.fat,
      dayType: { type: w.dayType.type, deltaPct: w.dayType.deltaPct },
    }));
    res.json({
      days: days.map((d, i) => ({ ...withItemsForMenu(d), dayTarget: dayTargets[i] })),
      calorieTarget: week[0].today.calories,
      baseCalorieTarget: week[0].base.calories,
      proteinTarget: week[0].today.protein,
      dayTargets,
    });
  } catch (error) {
    console.error('Weekly menu error:', error);
    res.status(500).json({ message: 'Error getting weekly menu' });
  }
});

// GET /nutrition/swap-meal - Get an alternative meal of the same type with similar calories
router.get('/swap-meal', auth, async (req, res) => {
  try {
    const validTypes = ['breakfast', 'snack', 'lunch', 'dinner'];
    const type = req.query.type;
    const calories = parseInt(req.query.calories);
    const excludeText = typeof req.query.excludeText === 'string'
      ? req.query.excludeText.slice(0, 200)
      : null;

    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid meal type' });
    }
    if (!calories || calories < 50 || calories > 2000) {
      return res.status(400).json({ message: 'Invalid calories' });
    }

    // Optional: the day's current total and its target, so the replacement keeps
    // the day inside its budget instead of drifting away from the target.
    const dayTotal = Number(req.query.dayTotal);
    const dayTarget = Number(req.query.target);
    const ctx = Number.isFinite(dayTotal) && Number.isFinite(dayTarget) && dayTotal > 0 && dayTotal < 20000 && dayTarget > 0 && dayTarget < 20000
      ? { dayTotal, target: dayTarget }
      : null;
    const meal = swapMeal(type, calories, excludeText, ctx);
    if (!meal) {
      return res.status(404).json({ message: 'No alternative meal found' });
    }

    res.json({ meal: withItems(meal) });
  } catch (error) {
    console.error('Swap meal error:', error);
    res.status(500).json({ message: 'Error swapping meal' });
  }
});

module.exports = router;
