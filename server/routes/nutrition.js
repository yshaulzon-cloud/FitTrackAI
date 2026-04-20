const express = require('express');
const auth = require('../middleware/auth');
const Nutrition = require('../models/Nutrition');
const { estimateNutrition, estimateNutritionAI } = require('../utils/calculations');

const router = express.Router();

// POST /nutrition/log
router.post('/log', auth, async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'יש להזין תיאור של הארוחה' });
    }

    let estimated = estimateNutrition(description);

    // If no match in local database, try AI estimation
    if (!estimated) {
      try {
        estimated = await estimateNutritionAI(description);
      } catch (aiErr) {
        console.error('AI estimation failed, using defaults:', aiErr.message);
        estimated = {
          calories: 300, protein: 15, carbs: 35, fat: 10, fiber: 2,
          source: 'default',
        };
      }
    }

    // Find today's nutrition log or create one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let nutritionLog = await Nutrition.findOne({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow },
    });

    const meal = {
      description: description.trim(),
      ...estimated,
      time: new Date(),
    };

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

    res.status(201).json({
      meal,
      daily: {
        totalCalories: nutritionLog.totalCalories,
        totalProtein: nutritionLog.totalProtein,
        totalCarbs: nutritionLog.totalCarbs,
        totalFat: nutritionLog.totalFat,
        totalFiber: nutritionLog.totalFiber || 0,
      },
    });
  } catch (error) {
    console.error('Nutrition log error:', error);
    res.status(500).json({ message: 'שגיאה בשמירת הארוחה' });
  }
});

// DELETE /nutrition/meal/:mealId
router.delete('/meal/:mealId', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nutritionLog = await Nutrition.findOne({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (!nutritionLog) {
      return res.status(404).json({ message: 'No nutrition log found' });
    }

    const meal = nutritionLog.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
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

    res.json({ message: 'Meal deleted', daily: {
      totalCalories: nutritionLog.totalCalories,
      totalProtein: nutritionLog.totalProtein,
      totalCarbs: nutritionLog.totalCarbs,
      totalFat: nutritionLog.totalFat,
      totalFiber: nutritionLog.totalFiber || 0,
    }});
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ message: 'Error deleting meal' });
  }
});

// GET /nutrition/today
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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
    res.status(500).json({ message: 'שגיאה בטעינת נתוני תזונה' });
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
    res.status(500).json({ message: 'שגיאה בטעינת היסטוריית תזונה' });
  }
});

module.exports = router;
