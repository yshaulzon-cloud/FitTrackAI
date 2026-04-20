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
    exercises: [
      {
        name: String,
        sets: Number,
        reps: String,
        muscleGroup: String,
      },
    ],
    caloriesBurned: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workout', workoutSchema);
