const express = require('express');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Measurement = require('../models/Measurement');
const Nutrition = require('../models/Nutrition');
const Workout = require('../models/Workout');
const Sleep = require('../models/Sleep');
const Progression = require('../models/Progression');
const {
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacros,
  calculateWeeklyWeightTarget,
  generateWorkoutPlan,
  generateBMIAnalysis,
} = require('../utils/calculations');

const router = express.Router();

const MEASUREMENT_TYPES = ['waist', 'chest', 'arm', 'thigh', 'hip', 'neck', 'forearm', 'calf'];

// GET /user/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = req.user;
    const response = {
      id: user._id,
      email: user.email,
      name: user.name || null,
      profile: user.profile,
      onboardingComplete: user.onboardingComplete,
      isAdmin: user.isAdmin || false,
      updatedAt: user.updatedAt,
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

      const bmiAnalysis = generateBMIAnalysis(user.profile);
      response.nutrition = { tdee, ree, formulaUsed, calorieTarget, macros, weeklyWeightTarget };
      response.workoutPlan = workoutPlan;
      response.bmiAnalysis = bmiAnalysis;
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
    body('city').optional({ checkFalsy: true }).isString().isLength({ min: 1, max: 60 }).withMessage('עיר לא תקינה'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { name, age, height, weight, gender, goal, workoutsPerWeek, experience, bodyFatPercentage, city } =
        req.body;

      const profileData = { age, height, weight, gender, goal, workoutsPerWeek, experience, bodyFatPercentage };
      if (city && String(city).trim()) {
        profileData.city = String(city).trim();
      }
      const updateData = {
        profile: profileData,
        onboardingComplete: true,
      };
      if (name && name.trim()) {
        updateData.name = name.trim();
      }

      const user = await User.findByIdAndUpdate(
        req.userId,
        updateData,
        { new: true }
      );

      const { tdee, ree, formulaUsed } = calculateTDEE(user.profile);
      const calorieTarget = calculateCalorieTarget(tdee, goal, weight, bodyFatPercentage);
      const macros = calculateMacros(weight, calorieTarget, goal, experience, bodyFatPercentage);
      const workoutPlan = generateWorkoutPlan(user.profile);
      const weeklyWeightTarget = calculateWeeklyWeightTarget(weight, goal, experience);

      const bmiAnalysis = generateBMIAnalysis(user.profile);
      res.json({
        profile: user.profile,
        nutrition: { tdee, ree, formulaUsed, calorieTarget, macros, weeklyWeightTarget },
        workoutPlan,
        bmiAnalysis,
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      res.status(500).json({ message: 'שגיאה בשמירת הפרופיל' });
    }
  }
);

// PUT /user/profile - update weight, height, goal, name, age
router.put(
  '/profile',
  auth,
  [
    body('weight').optional().isFloat({ min: 30, max: 300 }).withMessage('משקל לא תקין'),
    body('height').optional().isFloat({ min: 100, max: 250 }).withMessage('גובה לא תקין'),
    body('goal').optional().isIn(['bulk', 'cut', 'recomp', 'maintain']).withMessage('מטרה לא תקינה'),
    body('workoutsPerWeek').optional().isInt({ min: 1, max: 7 }).withMessage('מספר אימונים לא תקין'),
    body('gender').optional().isIn(['male', 'female']).withMessage('מין לא תקין'),
    body('name').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('שם לא תקין'),
    body('age').optional().isInt({ min: 13, max: 120 }).withMessage('גיל לא תקין'),
    body('bodyFatPercentage').optional().isFloat({ min: 3, max: 60 }).withMessage('אחוז שומן לא תקין'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { weight, height, goal, workoutsPerWeek, gender, name, age, bodyFatPercentage } = req.body;
      const user = req.user;

      // Detect a goal direction change so we can reset the journey baseline.
      const goalChanged = goal !== undefined && goal !== user.profile.goal;

      if (weight !== undefined) user.profile.weight = weight;
      if (height !== undefined) user.profile.height = height;
      if (goal !== undefined) user.profile.goal = goal;
      if (gender !== undefined) user.profile.gender = gender;
      if (workoutsPerWeek !== undefined) user.profile.workoutsPerWeek = workoutsPerWeek;
      if (age !== undefined) user.profile.age = age;
      if (bodyFatPercentage !== undefined) user.profile.bodyFatPercentage = bodyFatPercentage;
      if (name !== undefined) user.name = name;

      await user.save();

      // When the user picks a new goal, the journey "start line" must reset
      // to their current weight — otherwise the BMICard chart keeps drawing
      // the old start point and the progress percentage looks wrong.
      if (goalChanged) {
        await Progression.updateOne(
          { userId: user._id },
          { $set: { initialWeightDelta: null } }
        ).catch(() => {});
      }

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

      const bmiAnalysis = generateBMIAnalysis(user.profile);
      res.json({
        profile: user.profile,
        nutrition: { tdee, ree, formulaUsed, calorieTarget, macros, weeklyWeightTarget },
        workoutPlan,
        bmiAnalysis,
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ message: 'שגיאה בעדכון הפרופיל' });
    }
  }
);

// ────────────────────────────────────────────────────────────
// Body measurements (waist, chest, arm, thigh, …)
// ────────────────────────────────────────────────────────────

// GET /user/measurements - list all of the user's measurements
router.get('/measurements', auth, async (req, res) => {
  try {
    const items = await Measurement.find({ userId: req.userId })
      .sort({ type: 1, createdAt: -1 })
      .lean();

    // Group by type and compute the latest value + monthly delta
    const byType = {};
    for (const m of items) {
      if (!byType[m.type]) byType[m.type] = [];
      byType[m.type].push(m);
    }

    const summary = MEASUREMENT_TYPES.map((type) => {
      const list = byType[type] || [];
      const latest = list[0] || null;
      let delta = null;
      if (latest) {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        // Find the closest prior reading at least 25 days before the latest
        const prior = list.find(
          (m) => new Date(m.createdAt) <= monthAgo
        ) || (list.length > 1 ? list[list.length - 1] : null);
        if (prior && prior._id.toString() !== latest._id.toString()) {
          delta = Math.round((latest.value - prior.value) * 10) / 10;
        }
      }
      return { type, latest, delta, history: list };
    });

    res.json({ measurements: summary });
  } catch (error) {
    console.error('Measurement list error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת המדידות' });
  }
});

// POST /user/measurements - add a new measurement
router.post(
  '/measurements',
  auth,
  [
    body('type').isIn(MEASUREMENT_TYPES).withMessage('סוג מדידה לא תקין'),
    body('value').isFloat({ min: 5, max: 300 }).withMessage('ערך לא תקין'),
    body('notes').optional().isString().isLength({ max: 200 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { type, value, notes } = req.body;
      const measurement = await Measurement.create({
        userId: req.userId,
        type,
        value,
        notes: notes || null,
      });

      res.status(201).json({ measurement });
    } catch (error) {
      console.error('Measurement create error:', error);
      res.status(500).json({ message: 'שגיאה בשמירת המדידה' });
    }
  }
);

// DELETE /user/measurements/:id
router.delete(
  '/measurements/:id',
  auth,
  [param('id').isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'מזהה לא תקין' });
      }

      const result = await Measurement.deleteOne({
        _id: req.params.id,
        userId: req.userId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'מדידה לא נמצאה' });
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Measurement delete error:', error);
      res.status(500).json({ message: 'שגיאה במחיקת המדידה' });
    }
  }
);

// ────────────────────────────────────────────────────────────
// Reset data — wipe all logged data but keep the account
// ────────────────────────────────────────────────────────────
router.post('/reset-data', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const [n, w, s, p, m] = await Promise.all([
      Nutrition.deleteMany({ userId }),
      Workout.deleteMany({ userId }),
      Sleep.deleteMany({ userId }),
      Progression.deleteMany({ userId }),
      Measurement.deleteMany({ userId }),
    ]);
    res.json({
      ok: true,
      deleted: {
        nutrition: n.deletedCount,
        workouts: w.deletedCount,
        sleep: s.deletedCount,
        progression: p.deletedCount,
        measurements: m.deletedCount,
      },
    });
  } catch (error) {
    console.error('Reset data error:', error);
    res.status(500).json({ message: 'שגיאה באיפוס הנתונים' });
  }
});

// ────────────────────────────────────────────────────────────
// Delete account — type-to-confirm flow on the client
// ────────────────────────────────────────────────────────────
router.delete(
  '/account',
  auth,
  [body('confirm').equals('DELETE').withMessage('אישור לא תקין')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const userId = req.userId;
      // Cascade delete all user data
      await Promise.all([
        Nutrition.deleteMany({ userId }),
        Workout.deleteMany({ userId }),
        Sleep.deleteMany({ userId }),
        Progression.deleteMany({ userId }),
        Measurement.deleteMany({ userId }),
        User.deleteOne({ _id: userId }),
      ]);
      res.json({ ok: true });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ message: 'שגיאה במחיקת החשבון' });
    }
  }
);

// POST /user/set-password — set a new password for the authenticated user.
// This is the "Forgot password?" recovery path: the client first has the
// user prove identity via Google Sign-In (which issues the JWT that `auth`
// validates here), then lets them choose a new password. No email needed.
// Because you must already be authenticated to reach it, it's safe not to
// require the old password (the Google-recovery user doesn't know it).
router.post(
  '/set-password',
  auth,
  [
    body('newPassword')
      .isLength({ min: 8 }).withMessage('הסיסמה חייבת להכיל לפחות 8 תווים')
      .matches(/\d/).withMessage('הסיסמה חייבת לכלול לפחות ספרה אחת'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const user = await User.findById(req.userId).select('+password');
      if (!user) {
        return res.status(404).json({ message: 'משתמש לא נמצא', messageEn: 'User not found' });
      }

      user.password = req.body.newPassword;
      await user.save(); // pre-save hook hashes + stamps passwordChangedAt

      // Stamping passwordChangedAt invalidates every existing JWT (including
      // the one used for this request), so mint a fresh one issued *after*
      // the change and hand it back — the user stays logged in seamlessly.
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.json({
        token,
        message: 'הסיסמה נקבעה בהצלחה',
        messageEn: 'Password set successfully',
      });
    } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({ message: 'שגיאה בקביעת הסיסמה', messageEn: 'Failed to set the password' });
    }
  }
);

module.exports = router;
