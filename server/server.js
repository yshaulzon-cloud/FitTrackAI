const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const workoutRoutes = require('./routes/workout');
const nutritionRoutes = require('./routes/nutrition');
const adminRoutes = require('./routes/admin');
const progressionRoutes = require('./routes/progression');
const sleepRoutes = require('./routes/sleep');

const rateLimit = require('express-rate-limit');

const app = express();

// Trust Render's reverse proxy so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of the internal proxy address.
app.set('trust proxy', 1);

// Global rate limiter — applies to every authenticated API call.
// Auth-specific routes have their own stricter limiters in routes/auth.js.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests', messageHe: 'יותר מדי בקשות, נסה שוב עוד דקה' },
});
app.use(globalLimiter);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://accounts.google.com', 'https://apis.google.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://oauth2.googleapis.com', 'https://www.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS — in production we whitelist explicit origins. Locally (no
// CORS_ORIGIN env) we fall back to "allow any" for convenient dev.
const corsAllowlist = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// Always allow Capacitor's native WebView origins so the future Android
// build keeps working without server config changes.
const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);              // curl/same-origin
    if (corsAllowlist.length === 0) return callback(null, true); // dev mode
    const allowed = [...corsAllowlist, ...NATIVE_ORIGINS];
    if (allowed.includes(origin)) return callback(null, true);
    // Allow subdomains of an allowlisted host only — match against the
    // origin's *parsed* hostname with a leading-dot suffix check, so an
    // allowlist of "example.com" does not match "evilexample.com".
    let originHost;
    try { originHost = new URL(origin).hostname; }
    catch { return callback(new Error(`CORS blocked: ${origin}`)); }
    const ok = allowed.some((o) => {
      let allowHost;
      try { allowHost = new URL(o).hostname; } catch { return false; }
      return originHost === allowHost || originHost.endsWith('.' + allowHost);
    });
    if (ok) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());

// API Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/workout', workoutRoutes);
app.use('/nutrition', nutritionRoutes);
app.use('/admin', adminRoutes);
app.use('/progression', progressionRoutes);
app.use('/sleep', sleepRoutes);

// Bump on each release so a deployed build is verifiable from the health
// endpoints (poll GET / or /health after pushing to confirm Render redeployed).
const API_VERSION = '1.0.8';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: API_VERSION, timestamp: new Date().toISOString() });
});

// Serve frontend static files only if a client/dist exists.
// In production the frontend is hosted on Wangus (app.digtal-c.co.il)
// so this server is API-only. Locally we keep serving so a single
// `npm start` still gives a working all-in-one app.
const fs = require('fs');
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ name: 'Areto API', status: 'ok', version: API_VERSION });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', messageHe: 'שגיאת שרת פנימית' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3001;

// Start HTTP server immediately so Render sees a healthy process
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Connect to MongoDB (retry on failure)
function connectDB() {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
      console.error('MongoDB connection error:', err.message, '- retrying in 5s...');
      setTimeout(connectDB, 5000);
    });
}
connectDB();
