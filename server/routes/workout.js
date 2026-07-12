const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Workout = require('../models/Workout');
const User = require('../models/User');
const { body, param, validationResult } = require('express-validator');
const { calculateExerciseCalories, calculateCycleStatus } = require('../utils/calculations');
const { awardXP, updateStreak, revokeXP, recalcStreak, reconcileStreakForToday } = require('../utils/progression');
const { startOfUserDay, startOfUserDayOffset } = require('../utils/dates');
const { withUserLock } = require('../utils/userLock');

const router = express.Router();

// POST /workout/complete
router.post(
  '/complete',
  auth,
  [
    body('dayName').optional().isString().trim().isLength({ max: 100 }),
    body('durationMinutes').optional().isInt({ min: 1, max: 480 }),
    body('location').optional().isIn(['gym', 'home']),
    body('exercises').optional().isArray({ max: 30 }),
    body('exercises.*.name').optional().isString().trim().isLength({ max: 120 }),
    body('exercises.*.sets').optional().isInt({ min: 0, max: 20 }),
    body('exercises.*.reps').optional().isString().trim().isLength({ max: 30 }),
    body('exercises.*.muscleGroup').optional().isString().trim().isLength({ max: 50 }),
    body('exercises.*.mode').optional().isIn(['reps', 'time']),
    body('exercises.*.setLog').optional().isArray({ max: 30 }),
    body('exercises.*.setLog.*.reps').optional({ nullable: true }).isInt({ min: 0, max: 1000 }),
    body('exercises.*.setLog.*.weight').optional({ nullable: true }).isFloat({ min: 0, max: 1000 }),
    body('exercises.*.setLog.*.durationSec').optional({ nullable: true }).isInt({ min: 0, max: 36000 }),
    body('exercises.*.setLog.*.done').optional().isBoolean(),
  ],
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  try {
    const { dayName, exercises, durationMinutes, location } = req.body;
    const tz = req.user.profile?.timezone;

    // Everything from the duplicate-check through XP/streak runs under a
    // per-user lock so a double-submit can't create two workouts or award
    // XP/streak twice (audit #6). The locked block returns a { status, body }
    // descriptor which is sent once the lock releases.
    const out = await withUserLock(req.userId, async () => {
      // Block a second workout on the same (user-local) calendar day
      const todayStart = startOfUserDay(tz);
      const todayWorkout = await Workout.findOne({ userId: req.userId, date: { $gte: todayStart } });
      if (todayWorkout) {
        return { status: 400, body: { message: 'alreadyTrainedToday' } };
      }

      // Check cycle-based workout limit
      const maxPerWeek = req.user.profile?.workoutsPerWeek || 4;
      const recentWorkouts = await Workout.find({ userId: req.userId }).sort({ date: 1 }).lean();
      const { limitReached } = calculateCycleStatus(recentWorkouts, maxPerWeek);
      if (limitReached) {
        return { status: 400, body: { message: 'weeklyLimitReached' } };
      }

      // Estimate calories burned: ~5 MET for resistance training
      const weight = req.user.profile?.weight || 70;
      const duration = durationMinutes || 60;
      const caloriesBurned = calculateExerciseCalories(5, weight, duration);

      // Total volume = sum of weight×reps over completed sets. Computed
      // server-side so the client can't inflate it.
      let totalVolume = 0;
      for (const ex of exercises || []) {
        for (const s of ex.setLog || []) {
          if (s.done && s.weight > 0 && s.reps > 0) totalVolume += s.weight * s.reps;
        }
      }
      totalVolume = Math.round(totalVolume);

      // PR detection: compare each exercise's best completed-set weight in this
      // session against the user's history (recent window is plenty).
      const prs = [];
      if ((exercises || []).some(ex => (ex.setLog || []).some(s => s.done && s.weight > 0))) {
        const history = await Workout.find(
          { userId: req.userId },
          { 'exercises.name': 1, 'exercises.setLog': 1 }
        ).sort({ date: -1 }).limit(200).lean();

        const historicalBest = {};
        for (const w of history) {
          for (const ex of w.exercises || []) {
            for (const s of ex.setLog || []) {
              if (s.done && s.weight > 0) {
                if (!historicalBest[ex.name] || s.weight > historicalBest[ex.name]) {
                  historicalBest[ex.name] = s.weight;
                }
              }
            }
          }
        }
        for (const ex of exercises || []) {
          const sessionBest = Math.max(0, ...(ex.setLog || []).filter(s => s.done && s.weight > 0).map(s => s.weight));
          if (sessionBest > 0 && sessionBest > (historicalBest[ex.name] || 0)) {
            prs.push({ name: ex.name, weight: sessionBest });
          }
        }
      }

      // Previous volume for the same day-type — powers the "vs. last time"
      // comparison on the finish screen.
      let prevVolume = null;
      if (dayName) {
        const prev = await Workout.findOne(
          { userId: req.userId, dayName, totalVolume: { $gt: 0 } },
          { totalVolume: 1 }
        ).sort({ date: -1 }).lean();
        if (prev) prevVolume = prev.totalVolume;
      }

      const workout = await Workout.create({
        userId: req.userId,
        dayName,
        location: location || 'gym',
        exercises: exercises || [],
        durationMinutes: duration,
        caloriesBurned,
        totalVolume,
      });

      // Award XP for workout completion
      const xpResult = await awardXP(req.userId, 'workout');
      const streakResult = await updateStreak(req.userId, tz);

      return {
        status: 201,
        body: { ...workout.toObject(), xp: xpResult, streak: streakResult, prs, prevVolume },
      };
    });

    res.status(out.status).json(out.body);
  } catch (error) {
    console.error('Workout complete error:', error);
    res.status(500).json({ message: 'Error saving workout', messageHe: 'שגיאה בשמירת האימון' });
  }
  }
);

// POST /workout/performance — for a list of exercise names, return the most
// recent logged sets + all-time best weight. The live session uses this to
// prefill weights/reps ("last time you did 3×10 @ 40kg").
router.post(
  '/performance',
  auth,
  [
    body('names').isArray({ min: 1, max: 30 }),
    body('names.*').isString().trim().isLength({ min: 1, max: 120 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }
    try {
      const wanted = new Set(req.body.names);
      const history = await Workout.find(
        { userId: req.userId },
        { date: 1, 'exercises.name': 1, 'exercises.setLog': 1, 'exercises.mode': 1 }
      ).sort({ date: -1 }).limit(100).lean();

      const performances = {};
      for (const w of history) {
        for (const ex of w.exercises || []) {
          if (!wanted.has(ex.name)) continue;
          const doneSets = (ex.setLog || []).filter(s => s.done);
          if (doneSets.length === 0) continue;
          if (!performances[ex.name]) {
            performances[ex.name] = {
              date: w.date,
              sets: doneSets.map(s => ({ reps: s.reps, weight: s.weight, durationSec: s.durationSec })),
              bestWeight: 0,
            };
          }
          for (const s of doneSets) {
            if (s.weight > 0 && s.weight > performances[ex.name].bestWeight) {
              performances[ex.name].bestWeight = s.weight;
            }
          }
        }
      }
      res.json({ performances });
    } catch (error) {
      console.error('Workout performance error:', error);
      res.status(500).json({ message: 'Error loading performance', messageHe: 'שגיאה בטעינת ביצועים' });
    }
  }
);

// DELETE /workout/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid workout ID' });
    }
    const workout = await Workout.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(req.params.id),
      userId: req.userId,
    });
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    const tz = req.user.profile?.timezone;
    // Revoke XP and recalculate streak — serialized so a concurrent log/delete
    // can't interleave the read-modify-write (audit #6).
    await withUserLock(req.userId, async () => {
      await revokeXP(req.userId, 'workout', tz);
      // If today no longer has any qualifying activity, undo today's streak
      // XP too — must run before recalcStreak, which would otherwise already
      // have moved lastActivityDate off today.
      await reconcileStreakForToday(req.userId, tz);
      await recalcStreak(req.userId, tz);
    });
    res.json({ message: 'Workout deleted' });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ message: 'Error deleting workout' });
  }
});

// GET /workout/history
router.get('/history', auth, async (req, res) => {
  try {
    const [workouts, allDates, userDoc] = await Promise.all([
      Workout.find({ userId: req.userId }).sort({ date: -1 }).limit(30),
      Workout.find({ userId: req.userId }, { date: 1 }).sort({ date: -1 }),
      User.findById(req.userId, 'profile'),
    ]);

    const workoutsPerWeek = userDoc?.profile?.workoutsPerWeek || 4;

    // Week-based streak: counts consecutive weeks where the user met their
    // workoutsPerWeek target. Someone who trains Mon+Wed (2x/week) will
    // accumulate a streak every week they complete both sessions, instead of
    // having it reset every Tuesday when they skip a day.
    // Week boundary = Sunday 00:00 local (matches the UI's week grid).
    const tz = req.user.profile?.timezone;
    const today = startOfUserDay(tz);
    // Weekday in the user's timezone (0 = Sunday), not the server's.
    const dowName = new Intl.DateTimeFormat('en-US', { timeZone: tz || 'Asia/Jerusalem', weekday: 'short' }).format(today);
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dowName);
    const currentWeekSunday = startOfUserDayOffset(tz, -dow, today);

    let streak = 0;
    for (let w = 0; w < 104; w++) {
      const wStart = startOfUserDayOffset(tz, -w * 7, currentWeekSunday);
      const wEnd = startOfUserDayOffset(tz, 7, wStart);

      const count = allDates.filter(
        (d) => d.date >= wStart && d.date < wEnd
      ).length;

      if (w === 0) {
        // Current (possibly incomplete) week: counts if at least 1 workout
        // done — don't penalise the user mid-week. If the week hasn't started
        // yet (count=0), skip without breaking so we still show the historical
        // streak from previous weeks.
        if (count > 0) streak++;
      } else {
        if (count >= workoutsPerWeek) streak++;
        else break;
      }
    }

    const todayEnd = startOfUserDayOffset(tz, 1, today);
    const todayHasWorkout = allDates.some(
      (w) => w.date >= today && w.date < todayEnd
    );

    res.json({ workouts, streak, todayHasWorkout });
  } catch (error) {
    console.error('Workout history error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת היסטוריית אימונים' });
  }
});

module.exports = router;
