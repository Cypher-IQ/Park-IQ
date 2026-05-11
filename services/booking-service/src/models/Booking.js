const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  slotId: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  entryTime: { type: Date },
  exitTime: { type: Date },
  durationMinutes: { type: Number },
  status: { type: String, default: 'confirmed', enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'] },
  qrToken: { type: String, required: true, unique: true },
  qrCode: { type: String, required: true },
  estimatedPrice: { type: Number, default: 0 },
  finalPrice: { type: Number, default: 0 },
  paymentStatus: { type: String, default: 'pending', enum: ['pending', 'paid', 'failed', 'refunded'] },
  paymentTransactionId: { type: String },
  paymentCompletedAt: { type: Date },
  vehicleNumber: { type: String },
  notes: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);
