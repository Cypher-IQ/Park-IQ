const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  description: { type: String, default: '' }
}, { _id: false });

const featuresSchema = new mongoose.Schema({
  covered: { type: Boolean, default: false },
  cctv: { type: Boolean, default: true }
}, { _id: false });

const slotSchema = new mongoose.Schema({
  slotId: { type: String, required: true, unique: true },
  zone: { type: String, required: true },
  level: { type: Number, required: true },
  slotNumber: { type: Number, required: true },
  type: { type: String, default: 'standard', enum: ['standard', 'compact', 'ev-charging', 'handicapped'] },
  status: { type: String, default: 'available', enum: ['available', 'occupied', 'reserved', 'maintenance'] },
  location: { type: locationSchema, default: () => ({}) },
  features: { type: featuresSchema, default: () => ({}) },
  currentBookingId: { type: String, default: null },
  lastStatusChange: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Slot', slotSchema);
