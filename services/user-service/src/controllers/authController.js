const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const User = require('../models/User');

const generateTempToken = (id, role, tokenVersion = 0) => {
  return jwt.sign({ id, role, twoFactor: true, tokenVersion }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '10m',
  });
};

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const generateTokenForUser = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const getOAuthConfig = (provider) => {
  const configs = {
    google: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
      scopes: ['openid', 'email', 'profile'],
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
    },
    facebook: {
      authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/me',
      scopes: ['email', 'public_profile'],
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI,
    },
  };

  return configs[provider];
};

const ensureOAuthConfig = (provider) => {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error('Unsupported OAuth provider.');
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error(`${provider} OAuth is not configured.`);
  }
  return config;
};

const createOAuthState = (provider) => {
  const payload = {
    provider,
    nonce: crypto.randomBytes(10).toString('hex'),
    ts: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

const parseOAuthState = (state) => {
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    if (!parsed.provider || !parsed.ts) return null;
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
};

const verifyGoogleIdentity = async ({ accessToken, idToken }) => {
  if (idToken) {
    const tokenInfo = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
      timeout: 8000,
    });
    return {
      provider: 'google',
      providerId: tokenInfo.data.sub,
      email: tokenInfo.data.email,
      name: tokenInfo.data.name || tokenInfo.data.email,
      avatar: tokenInfo.data.picture,
      emailVerified: tokenInfo.data.email_verified === 'true' || tokenInfo.data.email_verified === true,
    };
  }

  const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 8000,
  });
  return {
    provider: 'google',
    providerId: profileRes.data.sub,
    email: profileRes.data.email,
    name: profileRes.data.name || profileRes.data.email,
    avatar: profileRes.data.picture,
    emailVerified: profileRes.data.email_verified === true,
  };
};

const verifyFacebookIdentity = async ({ accessToken }) => {
  const profileRes = await axios.get('https://graph.facebook.com/me', {
    params: { fields: 'id,name,email,picture.type(large)', access_token: accessToken },
    timeout: 8000,
  });
  return {
    provider: 'facebook',
    providerId: profileRes.data.id,
    email: profileRes.data.email,
    name: profileRes.data.name,
    avatar: profileRes.data.picture?.data?.url,
    emailVerified: !!profileRes.data.email,
  };
};

const verifySocialIdentity = async ({ provider, accessToken, idToken }) => {
  if (!provider) throw new Error('provider is required.');
  if (!accessToken && !idToken) throw new Error('accessToken or idToken is required.');

  if (provider === 'google') return verifyGoogleIdentity({ accessToken, idToken });
  if (provider === 'facebook') return verifyFacebookIdentity({ accessToken });
  throw new Error('Unsupported provider.');
};

const getOrCreateSocialUser = async ({ provider, providerId, email, name, avatar }) => {
  if (!providerId || !email || !name) {
    throw new Error('Verified social profile missing required fields.');
  }

  let user = await User.findOne({ $or: [{ email }, { socialId: providerId }] });
  if (!user) {
    user = await User.create({
      name,
      email,
      password: crypto.randomBytes(16).toString('hex'),
      role: 'user',
      socialProvider: provider,
      socialId: providerId,
      socialAvatar: avatar,
      isActive: true,
    });
  } else {
    user.name = name || user.name;
    user.socialProvider = provider;
    user.socialId = providerId;
    user.socialAvatar = avatar || user.socialAvatar;
    await user.save();
  }

  user.lastLogin = new Date();
  await user.save();
  return user;
};

// Helper: send token response
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateTokenForUser(user);
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      vehicleNumber: user.vehicleNumber,
      twoFactorEnabled: user.twoFactorEnabled || false,
      socialProvider: user.socialProvider,
      createdAt: user.createdAt,
    },
  });
};

// @route   POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, role, phone, vehicleNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      phone,
      vehicleNumber,
      isActive: true,
    });

    sendTokenResponse(newUser, 201, res, 'Registration successful!');
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated. Contact support.' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (user.twoFactorEnabled) {
      const twoFactorCode = String(Math.floor(100000 + Math.random() * 900000));
      user.twoFactorCode = crypto.createHash('sha256').update(twoFactorCode).digest('hex');
      user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      try {
        const { sendTwoFactorCode } = require('../../../booking-service/src/services/emailService');
        await sendTwoFactorCode(user.email, twoFactorCode);
      } catch (err) {
        console.log('[AuthService] 2FA email unavailable, but code created');
      }

      return res.status(200).json({
        success: true,
        requiresTwoFactor: true,
        tempToken: generateTempToken(user._id, user.role, user.tokenVersion || 0),
        message: 'Two-factor code sent to your email.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, 'Login successful!');
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/2fa/verify-login
const verifyTwoFactorLogin = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ success: false, message: 'tempToken and code are required.' });

    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'fallback_secret');
    if (!decoded.twoFactor) return res.status(400).json({ success: false, message: 'Invalid 2FA token.' });

    const user = await User.findById(decoded.id);
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA is not enabled for this account.' });
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    if (user.twoFactorCode !== hashedCode || !user.twoFactorExpires || user.twoFactorExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired 2FA code.' });
    }

    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, 'Login successful!');
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/2fa/setup
const setupTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.twoFactorCode = crypto.createHash('sha256').update(code).digest('hex');
    user.twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.twoFactorPending = true;
    await user.save();

    try {
      const { sendTwoFactorCode } = require('../../../booking-service/src/services/emailService');
      await sendTwoFactorCode(user.email, code);
    } catch {
      // best effort
    }

    res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/2fa/verify-setup
const verifyTwoFactorSetup = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id || req.user._id);
    if (!user || !user.twoFactorPending) {
      return res.status(400).json({ success: false, message: 'No pending 2FA setup.' });
    }

    const hashedCode = crypto.createHash('sha256').update(code || '').digest('hex');
    if (user.twoFactorCode !== hashedCode || !user.twoFactorExpires || user.twoFactorExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
    }

    user.twoFactorEnabled = true;
    user.twoFactorPending = false;
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Two-factor authentication enabled.' });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/2fa/disable
const disableTwoFactor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.twoFactorEnabled = false;
    user.twoFactorPending = false;
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/social-login
const socialLogin = async (req, res, next) => {
  try {
    const { provider, accessToken, idToken } = req.body;
    const verified = await verifySocialIdentity({ provider, accessToken, idToken });
    const user = await getOrCreateSocialUser(verified);
    sendTokenResponse(user, 200, res, `${provider} login successful!`);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Social login failed.' });
  }
};

// @route   GET /api/auth/oauth/:provider/start
const oauthStart = async (req, res, next) => {
  try {
    const provider = (req.params.provider || '').toLowerCase();
    const config = ensureOAuthConfig(provider);
    const state = createOAuthState(provider);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    if (provider === 'google') params.set('access_type', 'online');
    res.redirect(`${config.authUrl}?${params.toString()}`);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/oauth/:provider/callback
const oauthCallback = async (req, res) => {
  const provider = (req.params.provider || '').toLowerCase();
  const frontendBase = getFrontendUrl();

  try {
    const config = ensureOAuthConfig(provider);
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${frontendBase}/social-login?error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect(`${frontendBase}/social-login?error=${encodeURIComponent('missing_code')}`);
    }

    const parsedState = parseOAuthState(state || '');
    if (!parsedState || parsedState.provider !== provider) {
      return res.redirect(`${frontendBase}/social-login?error=${encodeURIComponent('invalid_state')}`);
    }

    const tokenParams = {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    };

    let accessToken;
    let idToken;

    if (provider === 'google') {
      const tokenRes = await axios.post(config.tokenUrl, new URLSearchParams({
        ...tokenParams,
        grant_type: 'authorization_code',
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });
      accessToken = tokenRes.data.access_token;
      idToken = tokenRes.data.id_token;
    } else {
      const tokenRes = await axios.get(config.tokenUrl, {
        params: tokenParams,
        timeout: 10000,
      });
      accessToken = tokenRes.data.access_token;
    }

    const verified = await verifySocialIdentity({ provider, accessToken, idToken });
    const user = await getOrCreateSocialUser(verified);
    const token = generateTokenForUser(user);

    return res.redirect(`${frontendBase}/social-login?token=${encodeURIComponent(token)}&provider=${encodeURIComponent(provider)}`);
  } catch (error) {
    return res.redirect(`${frontendBase}/social-login?error=${encodeURIComponent(error.message || 'oauth_failed')}`);
  }
};

// @route   GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, vehicleNumber } = req.body;
    const user = await User.findById(req.user.id || req.user._id).select('-password');
    
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.vehicleNumber = vehicleNumber || user.vehicleNumber;

    const updatedUser = await user.save();
    
    res.json({ success: true, message: 'Profile updated successfully.', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/auth/users (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find().select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await User.countDocuments();

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/auth/users/:id/deactivate (Admin)
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.isActive = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    const updatedUser = await user.save();
    
    res.json({ success: true, message: 'User deactivated.', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists (security)
      return res.status(200).json({ success: true, message: 'If email exists, reset link sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    try {
      const { sendPasswordReset } = require('../../../booking-service/src/services/emailService');
      await sendPasswordReset(user.email, user.name, resetToken);
    } catch (err) {
      console.log('[AuthService] Email service unavailable, but token created');
    }

    res.json({ success: true, message: 'If email exists, reset link sent.' });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and password required.' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
