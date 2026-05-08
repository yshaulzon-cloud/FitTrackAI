const mongoose = require('mongoose');

const sleepSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
      min: 0,
      max: 24,
    },
    quality: {
      type: String,
      enum: ['bad', 'ok', 'good', 'great'],
      default: 'ok',
    },
  },
  { timestamps: true }
);

// One entry per user per day
sleepSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Sleep', sleepSchema);
