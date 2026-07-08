const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  unlockedAt: { type: Date, default: Date.now },
});

const xpEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['workout', 'calorie_goal', 'protein_goal', 'streak_day', 'streak_week', 'sleep_goal'],
    required: true,
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const progressionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Core XP & Level
    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },

    // Streak tracking
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    weekStreaksCompleted: { type: Number, default: 0 },
    initialWeightDelta: { type: Number, default: null },

    // RPG Stats (0–100 scale)
    stats: {
      discipline: { type: Number, default: 10 },
      strength: { type: Number, default: 10 },
      recovery: { type: Number, default: 10 },
    },

    // Badges earned
    badges: [badgeSchema],

    // Recent XP events (keep last 50 for history display)
    xpHistory: [xpEventSchema],

    // Daily tracking flags (reset each day)
    dailyFlags: {
      date: { type: Date, default: null },
      workoutDone: { type: Boolean, default: false },
      calorieGoalMet: { type: Boolean, default: false },
      proteinGoalMet: { type: Boolean, default: false },
      sleepGoalMet: { type: Boolean, default: false },
    },

    // Sleep tracking stats
    sleepStreak: { type: Number, default: 0 },
    totalSleepLogs: { type: Number, default: 0 },

    // Calorie-goal streak (consecutive days the calorie target was hit —
    // separate from currentStreak, which is general app-activity days)
    calorieStreak: { type: Number, default: 0 },
    lastCalorieGoalDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Progression', progressionSchema);
