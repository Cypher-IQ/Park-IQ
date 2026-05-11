const assert = require('assert');
const axios = require('axios');
const { io } = require('socket.io-client');

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '3050';
process.env.INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret';

require('../server');

const baseUrl = `http://localhost:${process.env.PORT}`;

async function waitForSocketEvent(socket, eventName, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for socket event: ${eventName}`));
    }, timeoutMs);

    socket.once(eventName, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

async function run() {
  const socket = io(baseUrl, { transports: ['websocket', 'polling'] });

  try {
    await waitForSocketEvent(socket, 'connected', 8000);

    const payloadPromise = waitForSocketEvent(socket, 'parking:update', 8000);

    const response = await axios.post(
      `${baseUrl}/api/realtime/broadcast`,
      {
        event: 'parking:update',
        payload: { stats: { total: 50, available: 30, occupied: 15, reserved: 5 } },
      },
      {
        headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET },
        timeout: 8000,
      }
    );

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.data.success, true);

    const socketPayload = await payloadPromise;
    assert.strictEqual(socketPayload.stats.total, 50);
    assert.strictEqual(socketPayload.stats.available, 30);

    console.log('realtimeBroadcast.integration.test.js passed');
  } finally {
    socket.close();
    process.exit(0);
  }
}

run().catch((error) => {
  console.error('realtimeBroadcast.integration.test.js failed');
  console.error(error);
  process.exit(1);
});
