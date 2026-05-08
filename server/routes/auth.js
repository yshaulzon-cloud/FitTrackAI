const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'יותר מדי ניסיונות, נסה שוב בעוד 15 דקות' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'יותר מדי ניסיונות איפוס, נסה שוב בעוד 15 דקות' },
  standardHeaders: true,
  legacyHeaders: false,
});

function generateToken(userId) {
  // JWT_EXPIRES_IN is optional — default to 7 days. Without this fallback,
  // a missing env var causes jsonwebtoken to throw on startup of the route.
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('הסיסמה חייבת להכיל לפחות 6 תווים'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'כתובת האימייל כבר רשומה במערכת' });
      }

      const user = await User.create({ email, password });
      const token = generateToken(user._id);

      res.status(201).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          onboardingComplete: user.onboardingComplete,
          isAdmin: user.isAdmin || false,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ message: 'שגיאה בהרשמה, נסה שנית' });
    }
  }
);

// POST /auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
    body('password').notEmpty().withMessage('יש להזין סיסמה'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
      }

      const token = generateToken(user._id);

      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          onboardingComplete: user.onboardingComplete,
          isAdmin: user.isAdmin || false,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'שגיאה בהתחברות, נסה שנית' });
    }
  }
);

// POST /auth/forgot-password - send reset code to email
router.post(
  '/forgot-password',
  resetLimiter,
  [body('email').isEmail().withMessage('כתובת אימייל לא תקינה')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: 'אם האימייל קיים במערכת, נשלח קוד איפוס' });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetCode = code;
      user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // Send email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"BodySync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'BodySync - קוד איפוס סיסמה',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6c5ce7; text-align: center;">BodySync</h2>
            <p style="text-align: center; color: #333;">קוד האיפוס שלך:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00cec9; background: #f0f0f0; padding: 12px 24px; border-radius: 8px;">
                ${code}
              </span>
            </div>
            <p style="text-align: center; color: #888; font-size: 13px;">הקוד תקף ל-10 דקות</p>
          </div>
        `,
      });

      res.json({ message: 'אם האימייל קיים במערכת, נשלח קוד איפוס' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'שגיאה בשליחת הקוד' });
    }
  }
);

// POST /auth/reset-password - verify code and set new password
router.post(
  '/reset-password',
  resetLimiter,
  [
    body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('קוד לא תקין'),
    body('newPassword').isLength({ min: 6 }).withMessage('הסיסמה חייבת להכיל לפחות 6 תווים'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, code, newPassword } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user || !user.resetCode) {
        return res.status(400).json({ message: 'קוד שגוי' });
      }

      // Timing-safe comparison to prevent timing attacks
      const codeMatch = crypto.timingSafeEqual(
        Buffer.from(user.resetCode.padEnd(6)),
        Buffer.from(code.padEnd(6))
      );
      if (!codeMatch) {
        return res.status(400).json({ message: 'קוד שגוי' });
      }

      if (user.resetCodeExpires < new Date()) {
        return res.status(400).json({ message: 'הקוד פג תוקף, בקש קוד חדש' });
      }

      user.password = newPassword;
      user.resetCode = null;
      user.resetCodeExpires = null;
      await user.save();

      res.json({ message: 'הסיסמה שונתה בהצלחה' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'שגיאה באיפוס הסיסמה' });
    }
  }
);

module.exports = router;
