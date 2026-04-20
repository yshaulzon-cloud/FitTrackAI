const express = require('express');
const auth = require('../middleware/auth');
const Workout = require('../models/Workout');
const { calculateExerciseCalories } = require('../utils/calculations');

const router = express.Router();

// POST /workout/complete
router.post('/complete', auth, async (req, res) => {
  try {
    const { dayName, exercises, durationMinutes } = req.body;

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

    res.status(201).json(workout);
  } catch (error) {
    console.error('Workout complete error:', error);
    res.status(500).json({ message: 'שגיאה בשמירת האימון' });
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
