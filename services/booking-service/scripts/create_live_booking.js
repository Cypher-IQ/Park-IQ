require('dotenv').config();
const connectDB = require('../src/config/db');
const Booking = require('../src/models/Booking');
const QRCode = require('qrcode');

const run = async () => {
  await connectDB();

  const now = new Date();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const booking = {
    bookingId: 'BK-LIVE1',
    userId: 'live-user',
    slotId: 'B2',
    startTime: now,
    endTime: end,
    qrCode: '',
    qrToken: 'live-token-0001',
    estimatedPrice: 8.00,
    vehicleNumber: 'LIVE-001',
    status: 'confirmed'
  };

  try {
    const existing = await Booking.findOne({ bookingId: booking.bookingId });
    if (existing) {
      console.log('Test booking already exists:', booking.bookingId);
      process.exit(0);
    }
    booking.qrCode = await QRCode.toDataURL(JSON.stringify({ bookingId: booking.bookingId, token: booking.qrToken }));
    const doc = await Booking.create(booking);
    console.log('Created live booking:', doc.bookingId);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create live booking', err);
    process.exit(1);
  }
};

run();
