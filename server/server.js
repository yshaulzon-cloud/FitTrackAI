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

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

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
    // Allow any subdomain of an allowlisted host (e.g. app.example.com)
    if (allowed.some((o) => origin.endsWith(new URL(o).host))) return callback(null, true);
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    res.json({ name: 'Areto API', status: 'ok' });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'שגיאת שרת פנימית' });
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
