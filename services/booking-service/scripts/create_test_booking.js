require('dotenv').config();
const connectDB = require('../src/config/db');
const Booking = require('../src/models/Booking');
const QRCode = require('qrcode');

const run = async () => {
  await connectDB();

  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const booking = {
    bookingId: 'BK-TEST1234',
    userId: 'test-user',
    slotId: 'A1',
    startTime: now,
    endTime: end,
    qrCode: '',
    qrToken: 'test-token-1234',
    estimatedPrice: 5.00,
    finalPrice: 5.00,
    vehicleNumber: 'TEST-123',
    status: 'completed'
  };

  try {
    const existing = await Booking.findOne({ bookingId: booking.bookingId });
    if (existing) {
      console.log('Test booking already exists:', booking.bookingId);
      process.exit(0);
    }
    // generate QR data URL
    try {
      booking.qrCode = await QRCode.toDataURL(JSON.stringify({ bookingId: booking.bookingId, token: booking.qrToken }));
    } catch (e) {
      booking.qrCode = '';
    }

    const doc = await Booking.create(booking);
    console.log('Created test booking:', doc.bookingId);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create test booking', err);
    process.exit(1);
  }
};

run();
