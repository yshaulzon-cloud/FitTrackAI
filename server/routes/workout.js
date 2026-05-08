const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Workout = require('../models/Workout');
const { calculateExerciseCalories } = require('../utils/calculations');
const { awardXP, updateStreak, revokeXP, recalcStreak } = require('../utils/progression');

const router = express.Router();

// POST /workout/complete
router.post('/complete', auth, async (req, res) => {
  try {
    const { dayName, exercises, durationMinutes } = req.body;

    // Check cycle-based workout limit
    // A cycle starts from the first workout after the previous cycle ended
    // Cycle = 7 days from the first workout of the series
    const maxPerWeek = req.user.profile?.workoutsPerWeek || 4;
    const recentWorkouts = await Workout.find({ userId: req.userId })
      .sort({ date: 1 })
      .lean();

    if (recentWorkouts.length > 0) {
      // Walk through workouts to find the current cycle start
      let cycleStart = new Date(recentWorkouts[0].date);
      let cycleCount = 0;

      for (const w of recentWorkouts) {
        const wDate = new Date(w.date);
        const daysSinceCycleStart = (wDate - cycleStart) / (1000 * 60 * 60 * 24);

        if (daysSinceCycleStart >= 7) {
          // New cycle starts from this workout
          cycleStart = wDate;
          cycleCount = 1;
        } else {
          cycleCount++;
        }
      }

      // Check if current cycle is full and 7 days haven't passed yet
      const now = new Date();
      const daysSinceCycleStart = (now - cycleStart) / (1000 * 60 * 60 * 24);

      if (cycleCount >= maxPerWeek && daysSinceCycleStart < 7) {
        return res.status(400).json({ message: 'weeklyLimitReached' });
      }
    }

    // Estimate calories burned: ~5 MET for resistance training
    const weight = req.user.profile?.weight || 70;
    const duration = durationMinutes || 60;
    const caloriesBurned = calculateExerciseCalories(5, weight, duration);

    const workout = await Workout.create({
      userId: req.userId,
      dayName,
      exercises: exercises || [],
      durationMinutes: duration,
      caloriesBurned,
    });

    // Award XP for workout completion
    const xpResult = await awardXP(req.userId, 'workout');
    const streakResult = await updateStreak(req.userId);

    res.status(201).json({
      ...workout.toObject(),
      xp: xpResult,
      streak: streakResult,
    });
  } catch (error) {
    console.error('Workout complete error:', error);
    res.status(500).json({ message: 'שגיאה בשמירת האימון' });
  }
});

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
    // Revoke XP and recalculate streak
    await revokeXP(req.userId, 'workout');
    // Recalculate streak from actual workout history
    const remaining = await Workout.find({ userId: req.userId }).sort({ date: -1 }).limit(30);
    await recalcStreak(req.userId, remaining);
    res.json({ message: 'Workout deleted' });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ message: 'Error deleting workout' });
  }
});

// GET /workout/history
router.get('/history', auth, async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(30);

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const hasWorkout = workouts.some(
        (w) => w.date >= dayStart && w.date < dayEnd
      );

      if (hasWorkout) {
        streak++;
      } else if (i > 0) {
        break;
      }

      checkDate.setDate(checkDate.getDate() - 1);
    }

    res.json({ workouts, streak });
  } catch (error) {
    console.error('Workout history error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת היסטוריית אימונים' });
  }
});

module.exports = router;
