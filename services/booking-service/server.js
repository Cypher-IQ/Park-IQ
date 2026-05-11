require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const recurringRoutes = require('./src/routes/recurringRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

const app = express();
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3003;

// Connect to MongoDB
const connectDB = require('./src/config/db');
connectDB();
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) => {
  const connected = mongoose.connection && mongoose.connection.readyState === 1;
  res.json({ success: true, service: 'booking-service', status: connected ? 'healthy' : 'degraded', db: { connected, readyState: mongoose.connection.readyState }, degradedMode: !connected, timestamp: new Date().toISOString() });
});

app.use('/api/bookings/recurring', recurringRoutes);
app.use('/api/bookings', bookingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error('[booking-service]', err.stack);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n📋 booking-service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/bookings\n`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[booking-service] Port ${PORT} is already in use. Is another instance running?`);
    process.exit(1);
  }
  console.error('[booking-service] Server error', err);
  process.exit(1);
});

module.exports = app;
