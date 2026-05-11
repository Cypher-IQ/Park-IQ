const assert = require('assert');

const Payment = require('../src/models/Payment');
const PDFDocument = require('pdfkit');
const {
  initiatePayment,
  getInvoicePdf,
} = require('../src/controllers/paymentController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };
}

async function testInitiatePaymentValidation() {
  const req = { body: { bookingId: 'b1' } };
  const res = createMockRes();

  await initiatePayment(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
}

async function testInitiatePaymentNegativeAmount() {
  const req = { body: { bookingId: 'b1', userId: 'u1', amount: -10 } };
  const res = createMockRes();

  await initiatePayment(req, res, () => {});

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.success, false);
  assert.match(res.body.message, /cannot be negative/i);
}

async function testInvoiceNotFound() {
  const originalFindOne = Payment.findOne;
  Payment.findOne = () => ({ sort: async () => null });

  try {
    const req = { params: { bookingId: 'missing-booking' } };
    const res = createMockRes();

    await getInvoicePdf(req, res, () => {});

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
  } finally {
    Payment.findOne = originalFindOne;
  }
}

async function testInvoiceSuccess() {
  const originalFindOne = Payment.findOne;
  const originalPipe = PDFDocument.prototype.pipe;
  const originalFontSize = PDFDocument.prototype.fontSize;
  const originalText = PDFDocument.prototype.text;
  const originalMoveDown = PDFDocument.prototype.moveDown;
  const originalEnd = PDFDocument.prototype.end;

  const payment = {
    transactionId: 'TXN-TEST123',
    bookingId: 'BOOK-1001',
    userId: 'USER-1001',
    amount: 49.5,
    method: 'card',
    status: 'success',
    paidAt: new Date('2026-01-01T10:00:00Z'),
  };

  Payment.findOne = () => ({ sort: async () => payment });

  PDFDocument.prototype.pipe = function pipe() {
    return this;
  };
  PDFDocument.prototype.fontSize = function fontSize() {
    return this;
  };
  PDFDocument.prototype.text = function text() {
    return this;
  };
  PDFDocument.prototype.moveDown = function moveDown() {
    return this;
  };
  PDFDocument.prototype.end = function end() {
    return this;
  };

  try {
    const req = { params: { bookingId: 'BOOK-1001' } };
    const res = createMockRes();

    await getInvoicePdf(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['Content-Type'], 'application/pdf');
    assert.match(res.headers['Content-Disposition'], /invoice-BOOK-1001\.pdf/i);
  } finally {
    Payment.findOne = originalFindOne;
    PDFDocument.prototype.pipe = originalPipe;
    PDFDocument.prototype.fontSize = originalFontSize;
    PDFDocument.prototype.text = originalText;
    PDFDocument.prototype.moveDown = originalMoveDown;
    PDFDocument.prototype.end = originalEnd;
  }
}

async function run() {
  await testInitiatePaymentValidation();
  await testInitiatePaymentNegativeAmount();
  await testInvoiceNotFound();
  await testInvoiceSuccess();
  console.log('paymentController.test.js passed');
}

run().catch((error) => {
  console.error('paymentController.test.js failed');
  console.error(error);
  process.exit(1);
});
