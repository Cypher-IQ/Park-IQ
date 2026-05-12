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

const seedIfEmpty = async () => {
  const Slot = require('./src/models/Slot');
  const count = await Slot.countDocuments();
  if (count > 0) {
    console.log(`[parking-service] ${count} slots already exist, skipping seed.`);
    return;
  }
  const zones = ['A', 'B', 'C', 'D', 'E'];
  const types = ['standard', 'standard', 'standard', 'compact', 'ev-charging', 'handicapped'];
  const slots = [];
  zones.forEach((zone) => {
    for (let level = 1; level <= 2; level++) {
      for (let num = 1; num <= 10; num++) {
        const slotId = `${zone}${level}${String(num).padStart(2, '0')}`;
        slots.push({
          slotId, zone, level, slotNumber: num,
          type: types[Math.floor(Math.random() * types.length)],
          status: 'available',
          location: {
            lat: 12.9716 + (Math.random() * 0.01 - 0.005),
            lng: 77.5946 + (Math.random() * 0.01 - 0.005),
            description: `Zone ${zone}, Level ${level}, Slot ${num}`,
          },
          features: { covered: level > 1, cctv: true },
        });
      }
    }
  });
  await Slot.insertMany(slots);
  console.log(`[parking-service] ✅ Auto-seeded ${slots.length} parking slots.`);
};

(async () => {
  await connectDB();
  if (mongoose.connection.readyState === 1) {
    await seedIfEmpty();
  }
})();

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
 
