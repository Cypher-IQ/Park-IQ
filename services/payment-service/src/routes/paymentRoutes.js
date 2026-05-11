const express = require('express');
const { initiatePayment, retryPayment, getPaymentByBooking, getUserPayments, refundPayment, getRevenueStats, getInvoicePdf } = require('../controllers/paymentController');

const router = express.Router();

router.post('/initiate', initiatePayment);
router.post('/retry/:id', retryPayment);
router.get('/booking/:bookingId', getPaymentByBooking);
router.get('/user/:userId', getUserPayments);
router.get('/invoice/:bookingId', getInvoicePdf);
router.post('/refund/:id', refundPayment);
router.get('/admin/revenue', getRevenueStats);

module.exports = router;
