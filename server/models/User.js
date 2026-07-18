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
      minlength: [8, 'הסיסמה חייבת להכיל לפחות 8 תווים'],
      select: false,
    },
    passwordChangedAt: { type: Date, select: false },
    name: { type: String, trim: true, maxlength: 50 },
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
      city: { type: String, trim: true, maxlength: 60 },
      // The first seven are what onboarding collects today. 'home' and 'gym'
      // are the pre-2026 coarse values, kept in the enum so existing profiles
      // still validate on save — Mongoose would otherwise reject an untouched
      // legacy doc the moment the user edits their weight. normalizeEquipment()
      // in server/utils/equipment.js maps them forward on read.
      equipment: [{
        type: String,
        enum: [
          'dumbbells', 'barbell', 'machines', 'bands', 'trx', 'pullup_bar', 'kettlebell', 'none',
          'home', 'gym',
        ],
      }],
      // IANA timezone (e.g. "Asia/Jerusalem"). Drives the user's local-day
      // boundary for all streak/day calculations; falls back to Israel when
      // absent (see server/utils/dates.js).
      timezone: { type: String, trim: true, maxlength: 64, default: 'Asia/Jerusalem' },
    },
    onboardingComplete: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    // Password-reset state. Stored as a sha256 hash of the 6-digit code (the
    // plaintext code exists only in the email). select:false keeps these out
    // of every routine user query — only the reset endpoint opts in.
    resetCode: { type: String, default: null, select: false },
    resetCodeExpires: { type: Date, default: null, select: false },
    resetCodeAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

// Hash password before saving; stamp passwordChangedAt so old tokens are rejected
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
