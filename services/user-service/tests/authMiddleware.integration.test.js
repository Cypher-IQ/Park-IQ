const assert = require('assert');
const jwt = require('jsonwebtoken');

const User = require('../src/models/User');
const { protect } = require('../src/middleware/auth');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function runProtect(req) {
  const res = createMockRes();
  let nextCalled = false;
  let nextError = null;

  await protect(req, res, (err) => {
    nextCalled = true;
    nextError = err || null;
  });

  return { res, nextCalled, nextError, req };
}

async function testRejectsInactiveUser() {
  const originalFindById = User.findById;
  User.findById = async () => ({ _id: 'u1', isActive: false, tokenVersion: 0 });

  try {
    const token = jwt.sign({ id: 'u1', role: 'user', tokenVersion: 0 }, process.env.JWT_SECRET || 'fallback_secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { res, nextCalled } = await runProtect(req);

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.message, /deactivated/i);
  } finally {
    User.findById = originalFindById;
  }
}

async function testRejectsRevokedTokenVersion() {
  const originalFindById = User.findById;
  User.findById = async () => ({ _id: 'u1', isActive: true, tokenVersion: 3 });

  try {
    const token = jwt.sign({ id: 'u1', role: 'user', tokenVersion: 1 }, process.env.JWT_SECRET || 'fallback_secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { res, nextCalled } = await runProtect(req);

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.message, /Session expired/i);
  } finally {
    User.findById = originalFindById;
  }
}

async function testAllowsValidActiveUser() {
  const originalFindById = User.findById;
  const user = { _id: 'u1', id: 'u1', name: 'Valid User', role: 'user', isActive: true, tokenVersion: 2 };
  User.findById = async () => user;

  try {
    const token = jwt.sign({ id: 'u1', role: 'user', tokenVersion: 2 }, process.env.JWT_SECRET || 'fallback_secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { nextCalled, nextError } = await runProtect(req);

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(nextError, null);
    assert.strictEqual(req.user._id, 'u1');
  } finally {
    User.findById = originalFindById;
  }
}

async function run() {
  await testRejectsInactiveUser();
  await testRejectsRevokedTokenVersion();
  await testAllowsValidActiveUser();
  console.log('authMiddleware.integration.test.js passed');
}

run().catch((error) => {
  console.error('authMiddleware.integration.test.js failed');
  console.error(error);
  process.exit(1);
});
