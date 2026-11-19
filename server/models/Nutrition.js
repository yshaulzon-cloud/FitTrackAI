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
        // 'database' = read by the food engine or taken from a menu; 'manual' = the
        // user typed the numbers themselves (the food was not found). 'ai' / 'default'
        // are only found on old records — nothing writes them any more.
        source: { type: String, enum: ['database', 'manual', 'ai', 'default'], default: 'database' },
        englishName: { type: String, default: null },
        time: { type: Date, default: Date.now },
      },
    ],
    totalCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    totalFiber: { type: Number, default: 0 },
    // The day's target as it stood when meals were last logged (training / rest
    // adjusted). Lets history compare a past day with the target that applied
    // THEN rather than today's, so changing weight or goal doesn't rewrite it.
    // null = a day logged before snapshots existed (history falls back to the
    // current target).
    targetSnapshot: {
      type: new mongoose.Schema(
        {
          calories: Number,
          protein: Number,
          carbs: Number,
          fat: Number,
          baseCalories: Number,
          dayType: String, // 'training' | 'rest'
        },
        { _id: false }
      ),
      default: null,
    },
  },
  { timestamps: true }
);

// Every read of this collection is "this user's days" — a single day range
// (today's log), the latest 30 days, or all of a user's days (streak, export,
// account delete). Without an index each of those scanned the WHOLE collection,
// which gets slow as users and days pile up. Not unique on purpose: the build
// must never fail on existing data, and the code already tolerates a day doc.
nutritionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Nutrition', nutritionSchema);
