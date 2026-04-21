const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const workoutRoutes = require('./routes/workout');
const nutritionRoutes = require('./routes/nutrition');

const app = express();

// Middleware
app.use(cors({ credentials: true }));
app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/workout', workoutRoutes);
app.use('/nutrition', nutritionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// All non-API routes serve the React app (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

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
