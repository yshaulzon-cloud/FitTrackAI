const mongoose = require('mongoose');

const nutritionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: { type: Date, default: Date.now },
    meals: [
      {
        description: String,
        calories: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        fiber: { type: Number, default: 0 },
        source: { type: String, enum: ['database', 'ai', 'default'], default: 'database' },
        englishName: { type: String, default: null },
        time: { type: Date, default: Date.now },
      },
    ],
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    totalFiber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Nutrition', nutritionSchema);
