const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();

// Google OAuth verifier — uses the Web Client ID as audience.
// Set GOOGLE_CLIENT_ID in Render environment.
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { message: 'יותר מדי ניסיונות, נסה שוב בעוד 15 דקות' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limits EMAIL SENDING (forgot-password): strict, since each request fires
// an actual email. 5 sends per 15 min per IP is plenty for a real user.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'יותר מדי ניסיונות איפוס, נסה שוב בעוד 15 דקות', messageEn: 'Too many reset requests — try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limits CODE SUBMISSION (reset-password): looser. Brute-force protection
// here is the per-code 5-attempt lockout; sharing the strict email limiter
// meant a legitimate user (1 send + a resend + 2 typos + the correct code)
// got IP-blocked for 15 minutes mid-flow.
const resetSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { message: 'יותר מדי ניסיונות, נסה שוב בעוד 15 דקות', messageEn: 'Too many attempts — try again in 15 minutes' },
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

// Reset codes are stored as sha256 hashes — a DB dump can't be replayed, and
// comparing fixed-length digests makes timingSafeEqual safe for ANY user
// input (raw padEnd comparison threw a 500 on multibyte input, e.g. Hebrew
// letters, because the byte lengths differed).
function hashResetCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

// Gmail SMTP transporter. Built once and reused. Cloud hosts (Render free
// tier included) are flaky with Gmail's default secure port 465 — the
// connection can hang for a minute before failing. Port 587 + STARTTLS is
// more reliable there, and the explicit timeouts make a blocked connection
// fail in ~12s instead of holding the request open. Port is env-overridable
// (EMAIL_PORT) so it can be switched without a code change.
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const mailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, // 465 = implicit TLS, 587 = STARTTLS
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  connectionTimeout: 12000,
  greetingTimeout: 8000,
  socketTimeout: 15000,
});

// Log SMTP reachability once at boot so the Render logs show, in one line,
// whether outbound email can work at all — no need to trigger a reset to
// find out.
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  mailTransporter.verify()
    .then(() => console.log(`[mail] SMTP ready on ${process.env.EMAIL_HOST || 'smtp.gmail.com'}:${EMAIL_PORT}`))
    .catch((e) => console.error('[mail] SMTP verify FAILED:', e.message));
}

// POST /auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('הסיסמה חייבת להכיל לפחות 8 תווים')
      .matches(/\d/)
      .withMessage('הסיסמה חייבת לכלול לפחות ספרה אחת'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, password } = req.body;

      // Account enumeration mitigation: do NOT disclose whether the email
      // is already registered. A user who already has an account can
      // recover it via the "forgot password" flow.
      const genericError = 'לא ניתן להשלים את ההרשמה. אם כבר יש לך חשבון — נסה להיכנס או לאפס סיסמה.';

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: genericError });
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

// POST /auth/google — Google Sign-In (mobile + web)
// Mobile (Android via @codetrix-studio/capacitor-google-auth) sends `idToken`.
// Web (Google Identity Services popup flow) sends `accessToken`.
// We verify whichever was sent against our Web Client ID, then log the user
// in or create a new account using the verified email.
router.post(
  '/google',
  authLimiter,
  async (req, res) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ message: 'Google Sign-In לא מוגדר בשרת' });
      }

      const { idToken, accessToken } = req.body || {};
      if (!idToken && !accessToken) {
        return res.status(400).json({ message: 'idToken או accessToken חסר' });
      }

      let email;
      let name = null;

      if (idToken) {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
          return res.status(401).json({ message: 'האימייל של Google לא מאומת' });
        }
        email = payload.email.toLowerCase();
        name = payload.given_name || payload.name || null;
      } else {
        // Verify the access token via Google's tokeninfo endpoint. This
        // returns the audience the token was issued to and the user's email.
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
        );
        if (!tokenInfoRes.ok) {
          return res.status(401).json({ message: 'אימות Google נכשל' });
        }
        const info = await tokenInfoRes.json();
        if (info.aud !== process.env.GOOGLE_CLIENT_ID) {
          return res.status(401).json({ message: 'Google token audience mismatch' });
        }
        if (info.email_verified !== 'true' && info.email_verified !== true) {
          return res.status(401).json({ message: 'האימייל של Google לא מאומת' });
        }
        if (!info.email) {
          // tokeninfo doesn't always include email; fall back to userinfo
          const userInfoRes = await fetch(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!userInfoRes.ok) {
            return res.status(401).json({ message: 'לא ניתן לקבל פרטי משתמש מ-Google' });
          }
          const userInfo = await userInfoRes.json();
          if (!userInfo.email_verified) {
            return res.status(401).json({ message: 'האימייל של Google לא מאומת' });
          }
          email = userInfo.email.toLowerCase();
          name = userInfo.given_name || userInfo.name || null;
        } else {
          email = info.email.toLowerCase();
          // tokeninfo doesn't always include name fields — fetch userinfo for the name
          try {
            const userInfoRes = await fetch(
              'https://www.googleapis.com/oauth2/v3/userinfo',
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (userInfoRes.ok) {
              const userInfo = await userInfoRes.json();
              name = userInfo.given_name || userInfo.name || null;
            }
          } catch { /* name is optional */ }
        }
      }

      let user = await User.findOne({ email });
      if (!user) {
        // First-time Google sign-in → create account with a random password
        // (the user authenticates only via Google; password is unreachable).
        user = await User.create({
          email,
          password: crypto.randomBytes(32).toString('hex'),
          name,
        });
      } else if (name && !user.name) {
        user.name = name;
        await user.save();
      }

      const token = generateToken(user._id);
      res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name || null,
          onboardingComplete: user.onboardingComplete,
          isAdmin: user.isAdmin || false,
        },
      });
    } catch (error) {
      console.error('Google auth error:', error.message);
      res.status(401).json({ message: 'אימות Google נכשל' });
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
        return res.json({
          message: 'אם האימייל קיים במערכת, נשלח קוד איפוס',
          messageEn: 'If the email exists, a reset code was sent',
        });
      }

      // Generate 6-digit code
      // Cryptographically secure 6-digit code. crypto.randomInt uses the
      // OS CSPRNG (vs Math.random which is V8's predictable Mulberry32).
      const code = crypto.randomInt(100000, 1000000).toString();
      user.resetCode = hashResetCode(code);
      user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      // Fresh code = fresh attempt budget. Without this, failed guesses at an
      // old code carried over and a brand-new code could arrive pre-burned.
      user.resetCodeAttempts = 0;
      await user.save();

      // Send via the shared, timeout-guarded transporter.
      await mailTransporter.sendMail({
        from: `"Areto" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Areto - קוד איפוס סיסמה',
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2dd4bf; text-align: center;">Areto</h2>
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

      res.json({
        message: 'אם האימייל קיים במערכת, נשלח קוד איפוס',
        messageEn: 'If the email exists, a reset code was sent',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'שגיאה בשליחת הקוד', messageEn: 'Failed to send the code' });
    }
  }
);

// POST /auth/reset-password - verify code and set new password
router.post(
  '/reset-password',
  resetSubmitLimiter,
  [
    body('email').isEmail().withMessage('כתובת אימייל לא תקינה'),
    // Strict digits-only: isLength alone let 6 *characters* through, and a
    // multibyte string (e.g. Hebrew letters) crashed the old buffer compare.
    body('code').matches(/^\d{6}$/).withMessage('קוד לא תקין'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('הסיסמה חייבת להכיל לפחות 8 תווים')
      .matches(/\d/)
      .withMessage('הסיסמה חייבת לכלול לפחות ספרה אחת'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { email, code, newPassword } = req.body;
      // Reset fields are select:false on the model — opt in explicitly here.
      const user = await User.findOne({ email })
        .select('+password +resetCode +resetCodeExpires +resetCodeAttempts');

      if (!user || !user.resetCode) {
        return res.status(400).json({ message: 'קוד שגוי', messageEn: 'Wrong code' });
      }

      // Codes issued before the hashing migration (or anything malformed)
      // can't be compared — invalidate instead of risking a buffer-length
      // crash, and tell the user to request a fresh one.
      if (user.resetCode.length !== 64) {
        user.resetCode = null;
        user.resetCodeExpires = null;
        user.resetCodeAttempts = 0;
        await user.save();
        return res.status(400).json({
          message: 'הקוד אינו בתוקף, בקש קוד חדש',
          messageEn: 'This code is no longer valid — request a new one',
        });
      }

      // Check expiry before verifying the code (SEC-026)
      if (user.resetCodeExpires < new Date()) {
        user.resetCode = null;
        user.resetCodeExpires = null;
        user.resetCodeAttempts = 0;
        await user.save();
        return res.status(400).json({
          message: 'הקוד פג תוקף, בקש קוד חדש',
          messageEn: 'The code expired — request a new one',
        });
      }

      // Timing-safe comparison of equal-length sha256 digests. Hashing both
      // sides guarantees identical buffer lengths for any input, so this can
      // no longer throw (the old padEnd(6) compare 500'd on multibyte input).
      const codeMatch = crypto.timingSafeEqual(
        Buffer.from(user.resetCode, 'hex'),
        Buffer.from(hashResetCode(code), 'hex')
      );
      if (!codeMatch) {
        user.resetCodeAttempts = (user.resetCodeAttempts || 0) + 1;
        if (user.resetCodeAttempts >= 5) {
          user.resetCode = null;
          user.resetCodeExpires = null;
          user.resetCodeAttempts = 0;
          await user.save();
          return res.status(400).json({
            message: 'קוד בוטל אחרי יותר מדי ניסיונות — בקש קוד חדש',
            messageEn: 'Code cancelled after too many attempts — request a new one',
          });
        }
        await user.save();
        return res.status(400).json({ message: 'קוד שגוי', messageEn: 'Wrong code' });
      }

      user.password = newPassword;
      user.resetCode = null;
      user.resetCodeExpires = null;
      user.resetCodeAttempts = 0;
      await user.save();

      res.json({ message: 'הסיסמה שונתה בהצלחה', messageEn: 'Password changed successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'שגיאה באיפוס הסיסמה', messageEn: 'Password reset failed' });
    }
  }
);

module.exports = router;
