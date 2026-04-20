const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const {
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacros,
  calculateWeeklyWeightTarget,
  generateWorkoutPlan,
} = require('../utils/calculations');

const router = express.Router();

// GET /user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    const response = {
      id: user._id,
      email: user.email,
      profile: user.profile,
      onboardingComplete: user.onboardingComplete,
    };

    if (user.onboardingComplete && user.profile) {
      const { tdee, ree, formulaUsed } = calculateTDEE(user.profile);
      const calorieTarget = calculateCalorieTarget(
        tdee,
        user.profile.goal,
        user.profile.weight,
        user.profile.bodyFatPercentage
      );
      const macros = calculateMacros(
        user.profile.weight,
        calorieTarget,
        user.profile.goal,
        user.profile.experience,
        user.profile.bodyFatPercentage
      );
      const workoutPlan = generateWorkoutPlan(user.profile);
      const weeklyWeightTarget = calculateWeeklyWeightTarget(
        user.profile.weight,
        user.profile.goal,
        user.profile.experience
      );

      response.nutrition = { tdee, ree, formulaUsed, calorieTarget, macros, weeklyWeightTarget };
      response.workoutPlan = workoutPlan;
    }

    res.json(response);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת הפרופיל' });
  }
});

// POST /user/onboarding
router.post(
  '/onboarding',
  auth,
  [
    body('age').isInt({ min: 13, max: 120 }).withMessage('גיל לא תקין'),
    body('height').isFloat({ min: 100, max: 250 }).withMessage('גובה לא תקין'),
    body('weight').isFloat({ min: 30, max: 300 }).withMessage('משקל לא תקין'),
    body('gender').isIn(['male', 'female']).withMessage('יש לבחור מין'),
    body('goal').isIn(['bulk', 'cut', 'recomp', 'maintain']).withMessage('יש לבחור מטרה'),
    body('workoutsPerWeek').isInt({ min: 1, max: 7 }).withMessage('מספר אימונים לא תקין'),
    body('experience')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('יש לבחור רמת ניסיון'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { age, height, weight, gender, goal, workoutsPerWeek, experience, bodyFatPercentage } =
        req.body;

      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          profile: { age, height, weight, gender, goal, workoutsPerWeek, experience, bodyFatPercentage },
          onboardingComplete: true,
        },
        { new: true }
      );

      const { tdee, ree, formulaUsed } = calculateTDEE(user.profile);
      const calorieTarget = calculateCalorieTarget(tdee, goal, weight, bodyFatPercentage);
      const macros = calculateMacros(weight, calorieTarget, goal, experience, bodyFatPercentage);
      const workoutPlan = generateWorkoutPlan(user.profile);
      const weeklyWeightTarget = calculateWeeklyWeightTarget(weight, goal, experience);

      res.json({
        profile: user.profile,
        nutrition: { tdee, ree, formulaUsed, calorieTarget, macros, weeklyWeightTarget },
        workoutPlan,
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      res.status(500).json({ message: 'שגיאה בשמירת הפרופיל' });
    }
  }
);

// PUT /user/profile - update weight, height, goal
router.put(
  '/profile',
  auth,
  [
    body('weight').optional().isFloat({ min: 30, max: 300 }).withMessage('משקל לא תקין'),
    body('height').optional().isFloat({ min: 100, max: 250 }).withMessage('גובה לא תקין'),
    body('goal').optional().isIn(['bulk', 'cut', 'recomp', 'maintain']).withMessage('מטרה לא תקינה'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { weight, height, goal } = req.body;
      const user = req.user;

      if (weight !== undefined) user.profile.weight = weight;
      if (height !== undefined) user.profile.height = height;
      if (goal !== undefined) user.profile.goal = goal;

      await user.save();

      const { tdee, ree, formulaUsed } = calculateTDEE(user.profile);
      const calorieTarget = calculateCalorieTarget(
        tdee, user.profile.goal, user.profile.weight, user.profile.bodyFatPercentage
      );
      const macros = calculateMacros(
        user.profile.weight, calorieTarget, user.profile.goal,
        user.profile.experience, user.profile.bodyFatPercentage
      );
      const workoutPlan = generateWorkoutPlan(user.profile);
      const weeklyWeightTarget = calculateWeeklyWeightTarget(
        user.profile.weight, user.profile.goal, user.profile.experience
      );

      res.json({
        profile: user.profile,
        nutrition: { tdee, ree, formulaUsed, calorieTarget, macros, weeklyWeightTarget },
        workoutPlan,
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'שגיאה בעדכון הפרופיל' });
    }
  }
);

module.exports = router;
