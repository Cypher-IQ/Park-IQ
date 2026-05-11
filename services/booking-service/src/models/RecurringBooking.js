const mongoose = require('mongoose');
const crypto = require('crypto');

const recurringBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotId: { type: String, required: true },
  
  // Recurrence pattern
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], required: true },
  daysOfWeek: [{ type: Number }], // 0-6 for weekly (Mon-Sun)
  dateOfMonth: { type: Number }, // 1-31 for monthly
  customDays: [{ type: Date }], // For custom frequency
  
  // Booking timing
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }, // HH:MM format
  duration: { type: Number }, // minutes
  
  // Recurrence period
  recurrenceStartDate: { type: Date, required: true },
  recurrenceEndDate: { type: Date },
  maxOccurrences: { type: Number }, // Max bookings to create
  occurrencesCreated: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  autoRenew: { type: Boolean, default: true },
  
  // Preferences
  cancelIfConflict: { type: Boolean, default: true },
  notifyBefore: { type: Number, default: 24 }, // hours
  
  // Metadata
  bookingIds: [String], // References to created bookings
  nextScheduledDate: { type: Date },
  lastProcessed: { type: Date },
  
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Method to check if next booking should be created
recurringBookingSchema.methods.shouldCreateNextBooking = function() {
  if (!this.isActive) return false;
  if (this.maxOccurrences && this.occurrencesCreated >= this.maxOccurrences) return false;
  if (this.recurrenceEndDate && new Date() > this.recurrenceEndDate) return false;
  return !this.nextScheduledDate || new Date() >= this.nextScheduledDate;
};

// Method to calculate next booking date
recurringBookingSchema.methods.getNextBookingDate = function() {
  const now = new Date();
  const next = new Date(this.nextScheduledDate || this.recurrenceStartDate);

  if (this.frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (this.frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (this.frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }

  if (this.recurrenceEndDate && next > this.recurrenceEndDate) {
    return null;
  }
  return next;
};

module.exports = mongoose.model('RecurringBooking', recurringBookingSchema);
