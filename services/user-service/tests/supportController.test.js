const assert = require('assert');

const SupportThread = require('../src/models/SupportThread');
const {
  createThread,
  addMessage,
  closeThread,
  adminAssignThread,
  adminReplyToThread,
  adminUpdateStatus,
} = require('../src/controllers/supportController');

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

async function testCreateThreadValidation() {
  const req = {
    user: { id: 'u1', name: 'Test User' },
    body: { subject: '', message: '' },
  };
  const res = createMockRes();

  await createThread(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
}

async function testCreateThreadSuccess() {
  const originalCreate = SupportThread.create;
  SupportThread.create = async (payload) => ({ _id: 't1', status: 'open', ...payload });

  try {
    const req = {
      user: { id: 'u1', name: 'Test User' },
      body: { subject: 'Need Help', message: 'I cannot find my booking.' },
    };
    const res = createMockRes();

    await createThread(req, res, () => {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.subject, 'Need Help');
  } finally {
    SupportThread.create = originalCreate;
  }
}

async function testAddMessageAndCloseThread() {
  const originalFindOne = SupportThread.findOne;

  const thread = {
    _id: 't1',
    userId: 'u1',
    subject: 'Need Help',
    status: 'pending',
    messages: [],
    save: async function save() {
      return this;
    },
  };

  SupportThread.findOne = async () => thread;

  try {
    const msgReq = {
      params: { id: 't1' },
      user: { id: 'u1', name: 'Test User' },
      body: { message: 'Any update?' },
    };
    const msgRes = createMockRes();
    await addMessage(msgReq, msgRes, () => {});

    assert.strictEqual(msgRes.statusCode, 200);
    assert.strictEqual(msgRes.body.success, true);
    assert.strictEqual(thread.messages.length, 1);
    assert.strictEqual(thread.status, 'open');

    const closeReq = {
      params: { id: 't1' },
      user: { id: 'u1' },
    };
    const closeRes = createMockRes();
    await closeThread(closeReq, closeRes, () => {});

    assert.strictEqual(closeRes.statusCode, 200);
    assert.strictEqual(closeRes.body.success, true);
    assert.strictEqual(thread.status, 'resolved');
  } finally {
    SupportThread.findOne = originalFindOne;
  }
}

async function testAdminSupportWorkflow() {
  const originalFindById = SupportThread.findById;

  const thread = {
    _id: 't-admin-1',
    status: 'open',
    assignedTo: null,
    assignedAgentName: null,
    messages: [],
    save: async function save() {
      return this;
    },
    toObject() {
      return {
        _id: this._id,
        status: this.status,
        assignedTo: this.assignedTo,
        assignedAgentName: this.assignedAgentName,
        messages: this.messages,
      };
    },
  };

  SupportThread.findById = async () => thread;

  try {
    const assignReq = {
      params: { id: 't-admin-1' },
      user: { id: 'admin-1', _id: 'admin-1', name: 'Admin User' },
    };
    const assignRes = createMockRes();
    await adminAssignThread(assignReq, assignRes, () => {});
    assert.strictEqual(assignRes.statusCode, 200);
    assert.strictEqual(assignRes.body.success, true);
    assert.strictEqual(thread.assignedAgentName, 'Admin User');

    const replyReq = {
      params: { id: 't-admin-1' },
      user: { id: 'admin-1', _id: 'admin-1', name: 'Admin User' },
      body: { message: 'Hello, we are looking into this issue.' },
    };
    const replyRes = createMockRes();
    await adminReplyToThread(replyReq, replyRes, () => {});
    assert.strictEqual(replyRes.statusCode, 200);
    assert.strictEqual(replyRes.body.success, true);
    assert.strictEqual(thread.messages.length, 1);
    assert.strictEqual(thread.status, 'pending');

    const statusReq = {
      params: { id: 't-admin-1' },
      body: { status: 'resolved' },
    };
    const statusRes = createMockRes();
    await adminUpdateStatus(statusReq, statusRes, () => {});
    assert.strictEqual(statusRes.statusCode, 200);
    assert.strictEqual(statusRes.body.success, true);
    assert.strictEqual(thread.status, 'resolved');
  } finally {
    SupportThread.findById = originalFindById;
  }
}

async function run() {
  await testCreateThreadValidation();
  await testCreateThreadSuccess();
  await testAddMessageAndCloseThread();
  await testAdminSupportWorkflow();
  console.log('supportController.test.js passed');
}

run().catch((error) => {
  console.error('supportController.test.js failed');
  console.error(error);
  process.exit(1);
});
