const express = require('express');
const {
  createBooking, getUserBookings, getBookingById,
  scanEntry, scanExit, cancelBooking,
  getAllBookings, getBookingStats,
} = require('../controllers/bookingController');

const router = express.Router();

// Admin routes (must come BEFORE /:id to avoid conflict)
router.get('/admin/all', getAllBookings);
router.get('/admin/stats', getBookingStats);

// Entry/Exit QR scan (must come BEFORE /:id)
router.post('/entry', scanEntry);
router.post('/exit', scanExit);

// User booking CRUD
router.post('/', createBooking);
router.get('/', getUserBookings);
// Receipt (PDF)
router.get('/:id/receipt', require('../controllers/bookingController').generateReceipt);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

// Payment status update (called by payment-service)
router.patch('/:id/payment', async (req, res) => {
  const Booking = require('../models/Booking');
  try {
    const { paymentStatus, transactionId } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { bookingId: req.params.id },
      {
        paymentStatus,
        ...(transactionId && { paymentTransactionId: transactionId }),
        ...(paymentStatus === 'paid' ? { paymentCompletedAt: new Date() } : {}),
      },
      { new: true }
    );
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
