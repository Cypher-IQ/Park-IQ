const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed', 'free-hours'], default: 'percentage' },
  discount: { type: Number, required: true }, // % or $ amount or hours
  minBookingAmount: { type: Number, default: 0 },
  maxDiscount: { type: Number }, // Max discount amount (for percentage)
  applicableSlots: [{ type: String }], // Slot types this applies to (empty = all)
  applicableZones: [{ type: String }], // Zones this applies to (empty = all)
  usageLimit: { type: Number }, // Total uses allowed
  usagePerUser: { type: Number, default: 1 }, // Per user limit
  usageCount: { type: Number, default: 0 },
  users: [{ // Track per-user usage
    userId: mongoose.Schema.Types.ObjectId,
    count: { type: Number, default: 1 },
    lastUsed: Date,
  }],
  isActive: { type: Boolean, default: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Method to check if promo code is valid
promoCodeSchema.methods.isValid = function(userId = null) {
  const now = new Date();
  
  if (!this.isActive) return { valid: false, reason: 'Code is inactive' };
  if (now < this.startDate) return { valid: false, reason: 'Code not yet active' };
  if (now > this.expiryDate) return { valid: false, reason: 'Code has expired' };
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return { valid: false, reason: 'Code usage limit reached' };
  }
  
  if (userId) {
    const userUsage = this.users.find(u => u.userId.toString() === userId.toString());
    if (userUsage && userUsage.count >= this.usagePerUser) {
      return { valid: false, reason: `Maximum uses per user (${this.usagePerUser}) reached` };
    }
  }
  
  return { valid: true };
};

module.exports = mongoose.model('PromoCode', promoCodeSchema);
