const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  phone: { type: String },
  vehicleNumber: { type: String },
  isActive: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 },
  lastLogin: { type: Date },
  // Password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  // Two-factor auth
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date },
  twoFactorPending: { type: Boolean, default: false },
  // Social login
  socialProvider: { type: String },
  socialId: { type: String },
  socialAvatar: { type: String },
  // Profile
  profilePicture: { type: String }
}, {
  timestamps: true
});

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
