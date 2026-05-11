require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const parkingRoutes = require('./src/routes/parkingRoutes');

const app = express();
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3002;

// Connect to MongoDB
const connectDB = require('./src/config/db');
connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) => {
  const connected = mongoose.connection && mongoose.connection.readyState === 1;
  res.json({ success: true, service: 'parking-service', status: connected ? 'healthy' : 'degraded', db: { connected, readyState: mongoose.connection.readyState }, degradedMode: !connected, timestamp: new Date().toISOString() });
});

app.use('/api/parking', parkingRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error('[parking-service]', err.stack);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n🅿️  parking-service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/parking\n`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[parking-service] Port ${PORT} is already in use. Is another instance running?`);
    process.exit(1);
  }
  console.error('[parking-service] Server error', err);
  process.exit(1);
});

module.exports = app;
 
