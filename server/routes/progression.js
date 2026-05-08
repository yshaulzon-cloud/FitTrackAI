const express = require('express');
const auth = require('../middleware/auth');
const Workout = require('../models/Workout');
const { getProgressionStatus } = require('../utils/progression');
const { generateBMIAnalysis } = require('../utils/calculations');

const router = express.Router();

// GET /progression/status
router.get('/status', auth, async (req, res) => {
  try {
    const profile = req.user?.profile || {};

    // Count workouts in current cycle (7-day window from first workout of series)
    const allWorkouts = await Workout.find({ userId: req.userId })
      .sort({ date: 1 })
      .lean();

    let workoutsThisWeek = 0;
    if (allWorkouts.length > 0) {
      let cycleStart = new Date(allWorkouts[0].date);
      let cycleCount = 0;

      for (const w of allWorkouts) {
        const wDate = new Date(w.date);
        const daysSinceCycleStart = (wDate - cycleStart) / (1000 * 60 * 60 * 24);

        if (daysSinceCycleStart >= 7) {
          cycleStart = wDate;
          cycleCount = 1;
        } else {
          cycleCount++;
        }
      }

      // Check if we're still within the current cycle
      const now = new Date();
      const daysSinceCycleStart = (now - cycleStart) / (1000 * 60 * 60 * 24);
      workoutsThisWeek = daysSinceCycleStart < 7 ? cycleCount : 0;
    }

    // Get BMI analysis for weight goal progress
    let weightProgress = null;
    if (profile.weight && profile.height) {
      const bmi = generateBMIAnalysis(profile);
      if (bmi.weightDelta !== 0) {
        // weightDelta > 0 means need to lose, < 0 means need to gain
        // We want to show how close they are: 100% = at target
        // Use starting distance assumption: max(abs(weightDelta), 1)
        weightProgress = {
          currentWeight: profile.weight,
          targetWeight: bmi.targetWeight,
          weightDelta: bmi.weightDelta,
          classification: bmi.classification,
        };
      }
    }

    const status = await getProgressionStatus(req.userId, {
      workoutsPerWeek: profile.workoutsPerWeek || 4,
      workoutsThisWeek,
      weightProgress,
    });

    res.json(status);
  } catch (error) {
    console.error('Progression status error:', error);
    res.status(500).json({ message: 'Error loading progression' });
  }
});

module.exports = router;
