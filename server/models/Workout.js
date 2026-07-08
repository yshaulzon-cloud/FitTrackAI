const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: { type: Date, default: Date.now },
    completed: { type: Boolean, default: true },
    dayName: { type: String },
    // Where the session took place — affects how the client renders history
    // (home sessions have no weights).
    location: { type: String, enum: ['gym', 'home'], default: 'gym' },
    exercises: [
      {
        name: String,
        // Legacy summary fields (kept for old records + quick-log): number
        // of sets performed and the planned rep-range string.
        sets: Number,
        reps: String,
        muscleGroup: String,
        // 'reps' = classic sets×reps, 'time' = timed hold/cardio (home mode)
        mode: { type: String, enum: ['reps', 'time'], default: 'reps' },
        // Per-set log from a tracked live session. Old records simply don't
        // have this field — the schema addition is fully back-compatible.
        setLog: [
          {
            _id: false,
            reps: { type: Number, default: null },
            weight: { type: Number, default: null }, // kg, null = bodyweight
            durationSec: { type: Number, default: null }, // time-based sets
            done: { type: Boolean, default: false },
          },
        ],
      },
    ],
    // Total volume load (sum of weight×reps over completed sets) — lets the
    // history/summary screens show progression without re-crunching setLogs.
    totalVolume: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workout', workoutSchema);
