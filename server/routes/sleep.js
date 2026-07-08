const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Sleep = require('../models/Sleep');
const Workout = require('../models/Workout');
const { getSleepRecommendation } = require('../utils/calculations');
const { checkSleepGoal, updateStreak } = require('../utils/progression');

const router = express.Router();

// POST /sleep/log - Log sleep for a date
router.post(
  '/log',
  auth,
  [
    body('hours').isFloat({ min: 0, max: 24 }).withMessage('שעות שינה לא תקינות'),
    body('quality').optional().isIn(['bad', 'ok', 'good', 'great']).withMessage('איכות שינה לא תקינה'),
    body('date').optional().isISO8601().withMessage('תאריך לא תקין').custom((val) => {
      const d = new Date(val);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (d < sevenDaysAgo || d > new Date()) throw new Error('תאריך מחוץ לטווח המותר');
      return true;
    }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { hours, quality, date } = req.body;
      const logDate = date ? new Date(date) : new Date();
      logDate.setHours(0, 0, 0, 0);

      // Check if workout happened on this date
      const dayEnd = new Date(logDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const hadWorkout = await Workout.exists({
        userId: req.userId,
        date: { $gte: logDate, $lt: dayEnd },
      });

      // Get recommendation based on user age
      const age = req.user.profile?.age || 25;
      const recommendation = getSleepRecommendation(age, !!hadWorkout);

      // Upsert sleep entry
      const sleep = await Sleep.findOneAndUpdate(
        { userId: req.userId, date: logDate },
        { hours, quality: quality || 'ok' },
        { upsert: true, new: true }
      );

      // Check XP for sleep goal (tiered: minimum vs. recommended target)
      const xpResults = await checkSleepGoal(
        req.userId,
        hours,
        recommendation.min,
        recommendation.recommended || recommendation.min + 1
      );

      // Logging sleep counts toward the general activity streak too.
      await updateStreak(req.userId);

      res.json({
        sleep,
        recommendation,
        xpResults,
      });
    } catch (error) {
      console.error('Sleep log error:', error);
      res.status(500).json({ message: 'שגיאה בשמירת שינה' });
    }
  }
);

// GET /sleep/today - Get today's sleep + recommendation
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sleep = await Sleep.findOne({ userId: req.userId, date: today });

    // Check if workout today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hadWorkout = await Workout.exists({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow },
    });

    const age = req.user.profile?.age || 25;
    const recommendation = getSleepRecommendation(age, !!hadWorkout);

    res.json({
      sleep: sleep || null,
      recommendation,
    });
  } catch (error) {
    console.error('Sleep today error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת נתוני שינה' });
  }
});

// GET /sleep/history - Get sleep history (last 30 days)
router.get('/history', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const history = await Sleep.find({
      userId: req.userId,
      date: { $gte: thirtyDaysAgo },
    }).sort({ date: -1 }).lean();

    res.json(history);
  } catch (error) {
    console.error('Sleep history error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת היסטוריית שינה' });
  }
});

module.exports = router;
