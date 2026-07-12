const express = require('express');
const { param, query } = require('express-validator');
const auth = require('../middleware/auth');
const Nutrition = require('../models/Nutrition');
const { estimateNutrition, estimateNutritionAI, calculateTDEE, calculateCalorieTarget, calculateMacros } = require('../utils/calculations');
const { checkNutritionGoals, revokeXP, updateStreak, recalcStreak, reconcileStreakForToday } = require('../utils/progression');
const { startOfUserDay, startOfUserDayOffset } = require('../utils/dates');
const { withUserLock } = require('../utils/userLock');
const User = require('../models/User');
const { getRandomMenu, getWeeklyMenu, swapMeal } = require('../data/mealPlans');

const router = express.Router();

// POST /nutrition/log
router.post('/log', auth, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Meal description is required', messageHe: 'יש להזין תיאור של הארוחה' });
    }
    if (description.length > 500) {
      return res.status(400).json({ message: 'Description too long (max 500 chars)', messageHe: 'תיאור ארוך מדי (מקסימום 500 תווים)' });
    }

    let estimated = estimateNutrition(description);

    // Not in the local DB — try Gemini for a one-off estimate.
    if (!estimated) {
      try {
        estimated = await estimateNutritionAI(description);
      } catch (aiErr) {
        console.error('AI estimate error:', aiErr.message);
      }
    }

    // AI also failed — fall back to a generic average-meal estimate.
    if (!estimated) {
      estimated = {
        calories: 350, protein: 15, carbs: 40, fat: 12, fiber: 3,
        source: 'default', englishName: null,
      };
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
        });
      }

      // Check nutrition goals for XP + count today toward the general
      // activity streak (logging a meal counts as "showing up" for the day,
      // same as a workout or a sleep entry).
      let xpResults = [];
      try {
        const user = await User.findById(req.userId);
        if (user?.profile && user.onboardingComplete) {
          const { tdee } = calculateTDEE(user.profile);
          const calorieTarget = calculateCalorieTarget(tdee, user.profile.goal, user.profile.weight, user.profile.bodyFatPercentage);
          const macros = calculateMacros(user.profile.weight, calorieTarget, user.profile.goal, user.profile.experience, user.profile.bodyFatPercentage);
          xpResults = await checkNutritionGoals(req.userId, nutritionLog, { calorieTarget, macros }, tz);
        }
        await updateStreak(req.userId, tz);
      } catch (xpErr) {
        console.error('XP check error:', xpErr.message);
      }

      return { nutritionLog, xpResults };
    });

    res.status(201).json({
      meal,
      daily: {
        totalCalories: nutritionLog.totalCalories,
        totalProtein: nutritionLog.totalProtein,
        totalCarbs: nutritionLog.totalCarbs,
        totalFat: nutritionLog.totalFat,
        totalFiber: nutritionLog.totalFiber || 0,
      },
      xp: xpResults,
    });
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
      try {
        const user = await User.findById(req.userId);
        if (user?.profile && user.onboardingComplete) {
          const { tdee } = calculateTDEE(user.profile);
          const calorieTarget = calculateCalorieTarget(tdee, user.profile.goal, user.profile.weight, user.profile.bodyFatPercentage);
          const macros = calculateMacros(user.profile.weight, calorieTarget, user.profile.goal, user.profile.experience, user.profile.bodyFatPercentage);
          const calRatio = nutritionLog.totalCalories / calorieTarget;
          if (calRatio < 0.9 || calRatio > 1.1) {
            await revokeXP(req.userId, 'calorie_goal', tz);
          }
          const protRatio = nutritionLog.totalProtein / (macros?.protein || 1);
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

      return { status: 200, body: { message: 'Meal deleted', daily: {
        totalCalories: nutritionLog.totalCalories,
        totalProtein: nutritionLog.totalProtein,
        totalCarbs: nutritionLog.totalCarbs,
        totalFat: nutritionLog.totalFat,
        totalFiber: nutritionLog.totalFiber || 0,
      }}};
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

    // Fill in missing English names for old meals
    const logObj = nutritionLog.toObject();
    logObj.meals = logObj.meals.map(meal => {
      if (!meal.englishName && meal.description) {
        const match = estimateNutrition(meal.description);
        if (match && match.englishName) {
          meal.englishName = match.englishName;
        }
      }
      return meal;
    });

    res.json(logObj);
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

// GET /nutrition/daily-menu - Get a suggested daily menu based on calorie target
router.get('/daily-menu', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.profile || !user.onboardingComplete) {
      return res.status(400).json({ message: 'Profile not complete' });
    }

    const { tdee } = calculateTDEE(user.profile);
    const calorieTarget = calculateCalorieTarget(tdee, user.profile.goal, user.profile.weight, user.profile.bodyFatPercentage);
    const macros = calculateMacros(user.profile.weight, calorieTarget, user.profile.goal, user.profile.experience, user.profile.bodyFatPercentage);
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId) : null;

    const menu = getRandomMenu(calorieTarget, excludeId, macros.protein);
    if (!menu) {
      return res.status(404).json({ message: 'No menu found' });
    }

    res.json({ menu, calorieTarget, proteinTarget: macros.protein });
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

    const { tdee } = calculateTDEE(user.profile);
    const calorieTarget = calculateCalorieTarget(tdee, user.profile.goal, user.profile.weight, user.profile.bodyFatPercentage);
    const macros = calculateMacros(user.profile.weight, calorieTarget, user.profile.goal, user.profile.experience, user.profile.bodyFatPercentage);

    const days = getWeeklyMenu(calorieTarget, macros.protein);
    if (!days.length) {
      return res.status(404).json({ message: 'No weekly menu found' });
    }

    res.json({ days, calorieTarget, proteinTarget: macros.protein });
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

    const meal = swapMeal(type, calories, excludeText);
    if (!meal) {
      return res.status(404).json({ message: 'No alternative meal found' });
    }

    res.json({ meal });
  } catch (error) {
    console.error('Swap meal error:', error);
    res.status(500).json({ message: 'Error swapping meal' });
  }
});

module.exports = router;
