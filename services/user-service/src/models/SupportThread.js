const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  senderType: { type: String, enum: ['user', 'support', 'system'], required: true },
  senderId: { type: String },
  senderName: { type: String },
  message: { type: String, required: true },
  attachments: [{
    name: { type: String },
    type: { type: String },
    url: { type: String, required: true },
  }],
  readBy: [{
    userId: { type: String },
    role: { type: String, enum: ['user', 'support', 'system'] },
    readAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const supportThreadSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: [
      'payment_issue',
      'qr_code_issue',
      'refund_issue',
      'entry_exit_issue',
      'slot_booking_issue',
      'vehicle_number_issue',
      'other',
    ],
    required: true,
    default: 'other',
  },
  subject: { type: String, required: true },
  status: { type: String, enum: ['open', 'pending', 'resolved'], default: 'open' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAgentName: { type: String },
  slaDueAt: { type: Date },
  messages: [supportMessageSchema],
}, { timestamps: true });

module.exports = mongoose.model('SupportThread', supportThreadSchema);