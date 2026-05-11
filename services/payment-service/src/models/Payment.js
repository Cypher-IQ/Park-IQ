const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true },
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'card' },
  status: { type: String, default: 'pending', enum: ['pending', 'success', 'failed', 'refunded'] },
  cardLast4: { type: String },
  failureReason: { type: String },
  stripePaymentIntentId: { type: String },
  paidAt: { type: Date },
  refundedAt: { type: Date },
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
