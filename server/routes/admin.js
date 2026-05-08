const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');

const router = express.Router();

// Admin middleware
function adminOnly(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'אין הרשאות מנהל' });
  }
  next();
}

// GET /admin/stats - overview stats
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ onboardingComplete: true });
    const totalWorkouts = await Workout.countDocuments();
    const totalMeals = await Nutrition.countDocuments();

    // Users registered in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: weekAgo } });

    // Workouts in last 7 days
    const workoutsThisWeek = await Workout.countDocuments({ date: { $gte: weekAgo } });

    res.json({
      totalUsers,
      activeUsers,
      newUsersThisWeek,
      totalWorkouts,
      workoutsThisWeek,
      totalMeals,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת נתונים' });
  }
});

// GET /admin/users - list all users
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 }).lean();

    // Get workout count and last workout per user
    const userIds = users.map(u => u._id);
    const workoutCounts = await Workout.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, lastWorkout: { $max: '$date' } } },
    ]);
    const mealCounts = await Nutrition.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const workoutMap = {};
    workoutCounts.forEach(w => { workoutMap[w._id.toString()] = { count: w.count, lastWorkout: w.lastWorkout }; });
    const mealMap = {};
    mealCounts.forEach(m => { mealMap[m._id.toString()] = m.count; });

    const enrichedUsers = users.map(u => ({
      _id: u._id,
      email: u.email,
      isAdmin: u.isAdmin || false,
      onboardingComplete: u.onboardingComplete,
      createdAt: u.createdAt,
      profile: u.profile || null,
      workouts: workoutMap[u._id.toString()]?.count || 0,
      lastWorkout: workoutMap[u._id.toString()]?.lastWorkout || null,
      meals: mealMap[u._id.toString()] || 0,
    }));

    res.json({ users: enrichedUsers });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ message: 'שגיאה בטעינת משתמשים' });
  }
});

module.exports = router;
