const assert = require('assert');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const axios = require('axios');

const User = require('../src/models/User');
const {
  login,
  verifyTwoFactorLogin,
  socialLogin,
  oauthCallback,
  forgotPassword,
} = require('../src/controllers/authController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    redirectUrl: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    redirect(url) {
      this.redirectUrl = url;
      return this;
    },
  };
}

async function testTwoFactorJourney() {
  const originalFindOne = User.findOne;
  const originalFindById = User.findById;

  const user = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    isActive: true,
    tokenVersion: 0,
    twoFactorEnabled: true,
    twoFactorCode: null,
    twoFactorExpires: null,
    matchPassword: async (password) => password === 'secret123',
    save: async function save() { return this; },
  };

  User.findOne = async () => user;
  User.findById = async () => user;

  try {
    const loginReq = { body: { email: 'test@example.com', password: 'secret123' } };
    const loginRes = createMockRes();
    await login(loginReq, loginRes, () => {});

    assert.strictEqual(loginRes.statusCode, 200);
    assert.strictEqual(loginRes.body.success, true);
    assert.strictEqual(loginRes.body.requiresTwoFactor, true);
    assert.ok(loginRes.body.tempToken);

    const hashed = crypto.createHash('sha256').update('654321').digest('hex');
    user.twoFactorCode = hashed;
    user.twoFactorExpires = new Date(Date.now() + 5 * 60 * 1000);

    const verifyReq = { body: { tempToken: loginRes.body.tempToken, code: '654321' } };
    const verifyRes = createMockRes();
    await verifyTwoFactorLogin(verifyReq, verifyRes, () => {});

    assert.strictEqual(verifyRes.statusCode, 200);
    assert.strictEqual(verifyRes.body.success, true);
    assert.ok(verifyRes.body.token, '2FA verify should return login token');
  } finally {
    User.findOne = originalFindOne;
    User.findById = originalFindById;
  }
}

async function testSocialLoginValidation() {
  const req = { body: { provider: 'google' } };
  const res = createMockRes();

  await socialLogin(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
}

async function testSocialLoginWithVerifiedGoogleToken() {
  const originalAxiosGet = axios.get;
  const originalFindOne = User.findOne;
  const originalCreate = User.create;

  let createdPayload = null;

  axios.get = async (url) => {
    if (url.includes('googleapis.com/oauth2/v3/userinfo')) {
      return {
        data: {
          sub: 'google-sub-001',
          email: 'oauth.user@example.com',
          name: 'OAuth User',
          picture: 'https://example.com/avatar.png',
          email_verified: true,
        },
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  User.findOne = async () => null;
  User.create = async (payload) => {
    createdPayload = payload;
    return {
      ...payload,
      _id: '507f1f77bcf86cd799439055',
      tokenVersion: 0,
      createdAt: new Date(),
      save: async () => {},
    };
  };

  try {
    const req = {
      body: {
        provider: 'google',
        accessToken: 'valid-google-token',
      },
    };
    const res = createMockRes();
    await socialLogin(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(createdPayload.socialProvider, 'google');
    assert.strictEqual(createdPayload.socialId, 'google-sub-001');
  } finally {
    axios.get = originalAxiosGet;
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }
}

async function testOAuthCallbackRedirect() {
  const originalAxiosPost = axios.post;
  const originalAxiosGet = axios.get;
  const originalFindOne = User.findOne;
  const originalCreate = User.create;

  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-secret';
  process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/oauth/google/callback';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  axios.post = async (url) => {
    if (url.includes('oauth2.googleapis.com/token')) {
      return { data: { access_token: 'oauth-access', id_token: 'oauth-id-token' } };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  axios.get = async (url) => {
    if (url.includes('googleapis.com/tokeninfo')) {
      return {
        data: {
          sub: 'google-sub-callback',
          email: 'callback.user@example.com',
          name: 'Callback User',
          picture: 'https://example.com/callback.png',
          email_verified: 'true',
        },
      };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  User.findOne = async () => null;
  User.create = async (payload) => ({
    ...payload,
    _id: '507f1f77bcf86cd799439066',
    role: payload.role || 'user',
    tokenVersion: 0,
    save: async () => {},
  });

  try {
    const state = Buffer.from(JSON.stringify({ provider: 'google', nonce: 'abc', ts: Date.now() })).toString('base64url');
    const req = {
      params: { provider: 'google' },
      query: { code: 'oauth-code', state },
    };
    const res = createMockRes();

    await oauthCallback(req, res);

    assert.ok(res.redirectUrl, 'OAuth callback should redirect to frontend');
    assert.ok(res.redirectUrl.includes('/social-login?token='));
  } finally {
    axios.post = originalAxiosPost;
    axios.get = originalAxiosGet;
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }
}

async function testForgotPasswordDispatchesEmail() {
  const originalFindOne = User.findOne;
  const emailService = require(path.resolve(__dirname, '../../booking-service/src/services/emailService'));
  const originalSendPasswordReset = emailService.sendPasswordReset;

  let sent = null;
  const user = {
    email: 'forgot@example.com',
    name: 'Forgot User',
    save: async () => {},
  };

  User.findOne = async () => user;
  emailService.sendPasswordReset = async (email, name, token) => {
    sent = { email, name, token };
    return true;
  };

  try {
    const req = { body: { email: 'forgot@example.com' } };
    const res = createMockRes();
    await forgotPassword(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(sent, 'forgot password should dispatch reset email');
    assert.strictEqual(sent.email, 'forgot@example.com');
    assert.ok(sent.token, 'reset token should be generated');
  } finally {
    User.findOne = originalFindOne;
    emailService.sendPasswordReset = originalSendPasswordReset;
  }
}

async function run() {
  await testTwoFactorJourney();
  await testSocialLoginValidation();
  await testSocialLoginWithVerifiedGoogleToken();
  await testOAuthCallbackRedirect();
  await testForgotPasswordDispatchesEmail();
  console.log('authController.test.js passed');
}

run().catch((error) => {
  console.error('authController.test.js failed');
  console.error(error);
  process.exit(1);
});
