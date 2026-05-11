const express = require('express');
const {
  createRecurringBooking,
  getRecurringBookings,
  getRecurringBookingById,
  updateRecurringBooking,
  cancelRecurringBooking,
  processRecurringBooking,
} = require('../controllers/recurringController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createRecurringBooking);
router.get('/', protect, getRecurringBookings);
router.get('/:id', protect, getRecurringBookingById);
router.patch('/:id', protect, updateRecurringBooking);
router.patch('/:id/process', protect, processRecurringBooking);
router.delete('/:id', protect, cancelRecurringBooking);

module.exports = router;