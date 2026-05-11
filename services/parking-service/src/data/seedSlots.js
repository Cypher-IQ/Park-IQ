require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Fail fast when MongoDB is unreachable during seeding.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);
const Slot = require('../models/Slot');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/parkiq_parking';

const generateSlots = () => {
  const slots = [];
  const zones = ['A', 'B', 'C', 'D', 'E'];
  const types = ['standard', 'standard', 'standard', 'compact', 'ev-charging', 'handicapped'];

  zones.forEach((zone) => {
    for (let level = 1; level <= 2; level++) {
      for (let num = 1; num <= 10; num++) {
        const slotId = `${zone}${level}${String(num).padStart(2, '0')}`;
        slots.push({
          slotId,
          zone,
          level,
          slotNumber: num,
          type: types[Math.floor(Math.random() * types.length)],
          status: 'available',
          location: {
            lat: 12.9716 + (Math.random() * 0.01 - 0.005),
            lng: 77.5946 + (Math.random() * 0.01 - 0.005),
            description: `Zone ${zone}, Level ${level}, Slot ${num}`,
          },
          features: {
            covered: level > 1,
            cctv: true,
          },
        });
      }
    }
  });

  return slots;
};

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Slot.deleteMany({});
    console.log('🗑️  Cleared existing slots');

    const slots = generateSlots();
    await Slot.insertMany(slots);
    console.log(`✅ Seeded ${slots.length} parking slots across 5 zones`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
};

seed();
