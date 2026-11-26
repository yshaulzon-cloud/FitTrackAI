const express = require('express');
const mongoose = require('mongoose');
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

const { applyBaseMiddleware } = require('./utils/baseMiddleware');

const app = express();

// Trust Render's reverse proxy so express-rate-limit reads the real client IP
// from X-Forwarded-For instead of the internal proxy address.
app.set('trust proxy', 1);

// helmet → CORS → global rate limiter, in that order (see utils/baseMiddleware.js: CORS must come before the
// limiter so a 429 still carries CORS headers, and the limiter counts per signed-in user, else per IP).
// Auth-specific routes have their own stricter limiters in routes/auth.js.
applyBaseMiddleware(app);

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
const API_VERSION = '1.0.11';

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
app.use(require('./utils/errorHandler').errorHandler);

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
