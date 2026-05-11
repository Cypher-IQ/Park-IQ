const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = {
      id: decoded.id,
      role: decoded.role || 'user',
      tokenVersion: typeof decoded.tokenVersion === 'number' ? decoded.tokenVersion : 0,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  return next();
};

module.exports = { protect, adminOnly };