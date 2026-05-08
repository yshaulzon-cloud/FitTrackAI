const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['waist', 'chest', 'arm', 'thigh', 'hip', 'neck', 'forearm', 'calf'],
      required: true,
    },
    value: { type: Number, required: true, min: 5, max: 300 },
    unit: { type: String, default: 'cm' },
    notes: { type: String, maxlength: 200, default: null },
  },
  { timestamps: true }
);

measurementSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Measurement', measurementSchema);
