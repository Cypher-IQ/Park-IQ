const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const userQuery = User.findById(decoded.id);
    const user = userQuery && typeof userQuery.select === 'function'
      ? await userQuery.select('-password')
      : await userQuery;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }

    const tokenVersion = typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0;
    if (tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    next(error);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
};

// Lightweight token verifier (for API gateway use — no DB lookup)
const verifyTokenOnly = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided.' });
    }
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = { protect, adminOnly, verifyTokenOnly };
