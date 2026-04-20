const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

// POST /auth/register
router.post(
  '/register',
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
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'שגיאה בהתחברות, נסה שנית' });
    }
  }
);

module.exports = router;
