require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./src/routes/authRoutes');
const loyaltyRoutes = require('./src/routes/loyaltyRoutes');
const supportRoutes = require('./src/routes/supportRoutes');

const app = express();
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
const connectDB = require('./src/config/db');
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing & logging
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  const connected = mongoose.connection && mongoose.connection.readyState === 1;
  res.json({ success: true, service: 'user-service', status: connected ? 'healthy' : 'degraded', db: { connected, readyState: mongoose.connection.readyState }, degradedMode: !connected, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/support', supportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[user-service] Error:`, err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 user-service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Auth API: http://localhost:${PORT}/api/auth\n`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[user-service] Port ${PORT} is already in use. Is another instance running?`);
    process.exit(1);
  }
  console.error('[user-service] Server error', err);
  process.exit(1);
});

module.exports = app;
