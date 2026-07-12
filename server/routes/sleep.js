const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Sleep = require('../models/Sleep');
const Workout = require('../models/Workout');
const { getSleepRecommendation } = require('../utils/calculations');
const { checkSleepGoal, updateStreak } = require('../utils/progression');
const { startOfUserDay, startOfUserDayOffset } = require('../utils/dates');
const { withUserLock } = require('../utils/userLock');

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
      const tz = req.user.profile?.timezone;
      // Anchor the log to the user's local calendar day.
      const logDate = startOfUserDay(tz, date ? new Date(date) : new Date());
      const today = startOfUserDay(tz);
      const isToday = logDate.getTime() === today.getTime();

      // Check if workout happened on this date
      const dayEnd = startOfUserDayOffset(tz, 1, logDate);
      const hadWorkout = await Workout.exists({
        userId: req.userId,
        date: { $gte: logDate, $lt: dayEnd },
      });

      // Get recommendation based on user age
      const age = req.user.profile?.age || 25;
      const recommendation = getSleepRecommendation(age, !!hadWorkout);

      // Serialize the upsert + XP + streak (audit #6).
      const { sleep, xpResults } = await withUserLock(req.userId, async () => {
        // Upsert sleep entry — track whether this is a genuinely new night's
        // log or an edit to an existing entry (matters for totalSleepLogs).
        const existedBefore = await Sleep.exists({ userId: req.userId, date: logDate });
        const sleep = await Sleep.findOneAndUpdate(
          { userId: req.userId, date: logDate },
          { hours, quality: quality || 'ok' },
          { upsert: true, new: true }
        );

        // Check XP for sleep goal (tiered: minimum vs. recommended target).
        // checkSleepGoal itself only grants today's XP/flag/streak; a back-
        // filled past date is recorded but doesn't move today's numbers.
        const xpResults = await checkSleepGoal(req.userId, {
          hours,
          recommendedMin: recommendation.min,
          recommendedTarget: recommendation.recommended || recommendation.min + 1,
          isNewLog: !existedBefore,
          logDate,
          tz,
        });

        // Logging sleep counts toward the general activity streak — but only
        // when the night being logged is *today* (audit #2). Back-filling a
        // past date must not mark today active.
        if (isToday) await updateStreak(req.userId, tz);

        return { sleep, xpResults };
      });

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
    const tz = req.user.profile?.timezone;
    const today = startOfUserDay(tz);

    const sleep = await Sleep.findOne({ userId: req.userId, date: today });

    // Check if workout today
    const tomorrow = startOfUserDayOffset(tz, 1, today);
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
    const tz = req.user.profile?.timezone;
    const thirtyDaysAgo = startOfUserDayOffset(tz, -30);

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
