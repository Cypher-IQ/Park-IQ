const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  getAllUsers,
  deactivateUser,
  forgotPassword,
  resetPassword,
  verifyTwoFactorLogin,
  setupTwoFactor,
  verifyTwoFactorSetup,
  disableTwoFactor,
  socialLogin,
  oauthStart,
  oauthCallback,
} = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }).withMessage('Name too short'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role must be user or admin'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/2fa/verify-login', verifyTwoFactorLogin);
router.get('/oauth/:provider/start', oauthStart);
router.get('/oauth/:provider/callback', oauthCallback);
router.post('/social-login', socialLogin);

router.get('/internal/profile/:id', async (req, res, next) => {
  try {
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret !== (process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret')) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// Protected routes (require JWT)
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/2fa/setup', protect, setupTwoFactor);
router.post('/2fa/verify-setup', protect, verifyTwoFactorSetup);
router.post('/2fa/disable', protect, disableTwoFactor);

// Admin routes
router.get('/users', protect, adminOnly, getAllUsers);
router.patch('/users/:id/deactivate', protect, adminOnly, deactivateUser);

module.exports = router;
