const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'אימייל הוא שדה חובה'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'כתובת אימייל לא תקינה'],
    },
    password: {
      type: String,
      required: [true, 'סיסמה היא שדה חובה'],
      minlength: [6, 'הסיסמה חייבת להכיל לפחות 6 תווים'],
      select: false,
    },
    profile: {
      age: { type: Number, min: 13, max: 120 },
      height: { type: Number, min: 100, max: 250 },
      weight: { type: Number, min: 30, max: 300 },
      gender: { type: String, enum: ['male', 'female'] },
      goal: {
        type: String,
        enum: ['bulk', 'cut', 'recomp', 'maintain'],
      },
      workoutsPerWeek: { type: Number, min: 1, max: 7 },
      experience: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
      },
      bodyFatPercentage: { type: Number, min: 3, max: 60 },
    },
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
