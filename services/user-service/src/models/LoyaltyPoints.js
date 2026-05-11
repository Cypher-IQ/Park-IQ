const mongoose = require('mongoose');

const loyaltyPointsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, default: 0 },
  pointsEarned: { type: Number, default: 0 }, // Total ever earned
  pointsRedeemed: { type: Number, default: 0 }, // Total ever used
  history: [{
    type: { type: String, enum: ['earned', 'redeemed', 'expired'] },
    points: Number,
    reason: String, // 'booking_completed', 'promo_used', etc
    bookingId: String,
    date: { type: Date, default: Date.now },
  }],
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  // Tier thresholds
  tierSince: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LoyaltyPoints', loyaltyPointsSchema);
