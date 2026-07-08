const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'נדרשת התחברות' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('+passwordChangedAt');
    if (!user) {
      return res.status(401).json({ message: 'משתמש לא נמצא' });
    }

    // Reject tokens issued before the last password change (SEC-022)
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ message: 'הסיסמה שונתה, יש להתחבר מחדש' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'הסשן פג תוקף, יש להתחבר מחדש' });
    }
    return res.status(401).json({ message: 'אימות נכשל' });
  }
};

module.exports = auth;
