const crypto = require('crypto');
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const Payment = require('../models/Payment');
const { sendPaymentReceipt } = require('../services/emailService');
const PDFDocument = require('pdfkit');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const strictPayments = process.env.REQUIRE_REAL_PAYMENTS === 'true' || process.env.NODE_ENV === 'production';
const hasRealStripeKey = !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder';

const buildSyntheticPayment = (booking) => {
  if (!booking || booking.status !== 'completed') return null;
  const amount = Number(booking.finalPrice || booking.estimatedPrice || 0);
  if (!amount || amount <= 0) return null;

  return {
    _id: `synthetic-${booking.bookingId}`,
    transactionId: booking.paymentTransactionId || `AUTO-${booking.bookingId}`,
    bookingId: booking.bookingId,
    userId: booking.userId,
    amount,
    method: 'auto-exit',
    status: booking.paymentStatus === 'paid' ? 'success' : 'pending',
    paidAt: booking.paymentCompletedAt || booking.exitTime || booking.updatedAt || booking.createdAt || new Date(),
    generatedFromBooking: true,
  };
};

const fetchCompletedBookings = async (userId = null) => {
  try {
    const url = userId
      ? `${BOOKING_SERVICE_URL}/api/bookings?userId=${encodeURIComponent(userId)}&status=completed&page=1&limit=100`
      : `${BOOKING_SERVICE_URL}/api/bookings/admin/all?status=completed&page=1&limit=100`;
    const res = await axios.get(url, { timeout: 30000 });
    return res.data?.data || [];
  } catch (err) {
    console.error('[PaymentService] Failed to fetch booking fallback data:', err.message);
    return [];
  }
};

const mergePaymentsWithBookings = (payments, bookings) => {
  const seen = new Set(payments.map((payment) => payment.bookingId));
  const synthetic = bookings
    .map(buildSyntheticPayment)
    .filter(Boolean)
    .filter((payment) => !seen.has(payment.bookingId));
  return [...payments, ...synthetic];
};

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// @route   POST /api/payments/initiate
const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId, userId, amount, method = 'card' } = req.body;

    if (!bookingId || !userId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'bookingId, userId, and amount are required.' });
    }
    if (amount < 0) {
      return res.status(400).json({ success: false, message: 'Amount cannot be negative.' });
    }

    // Check for existing successful payment
    const existingPayment = await Payment.findOne({ bookingId, status: 'success' });
    if (existingPayment) {
      return res.status(409).json({ success: false, message: 'Booking already paid.', data: existingPayment });
    }

    const transactionId = `TXN-${crypto.randomUUID().substring(0, 10).toUpperCase()}`;

    let stripePaymentIntentId = null;
    let paymentSuccess = true;
    let failureReason = null;
    let cardLast4 = method === 'card' ? '4242' : null;

    if (strictPayments && !hasRealStripeKey) {
      return res.status(503).json({
        success: false,
        message: 'Real payment mode is enabled but STRIPE_SECRET_KEY is missing.',
      });
    }

    // Attempt Stripe Integration
    try {
      if (hasRealStripeKey) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // convert to cents
          currency: 'usd',
          metadata: { bookingId, userId },
        });
        stripePaymentIntentId = paymentIntent.id;
        // In a real app, we'd send client_secret to frontend. 
        // Here we simulate immediate success for the existing UI flow.
      } else {
        // Fallback for local testing without keys
        console.log('[PaymentService] Warning: Using simulated Stripe due to missing STRIPE_SECRET_KEY');
      }
    } catch (stripeErr) {
      paymentSuccess = false;
      failureReason = stripeErr.message;
    }

    // Create payment record in DB
    const payment = await Payment.create({
      transactionId,
      bookingId,
      userId,
      amount: parseFloat(amount.toFixed(2)),
      method,
      status: paymentSuccess ? 'success' : 'failed',
      stripePaymentIntentId,
      cardLast4,
      failureReason,
      paidAt: paymentSuccess ? new Date() : null,
    });

    if (paymentSuccess) {
      // Notify booking service of payment
      try {
        await axios.patch(
          `${BOOKING_SERVICE_URL}/api/bookings/${bookingId}/payment`,
          { paymentStatus: 'paid', transactionId },
          { timeout: 30000 }
        );
      } catch (err) {
        console.error('[PaymentService] Failed to notify booking service:', err.message);
      }

      // Send payment receipt email
      try {
        const userRes = await axios.get(`${USER_SERVICE_URL}/api/auth/internal/profile/${userId}`, {
          headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret' },
          timeout: 30000,
        });
        if (userRes.data.user && userRes.data.user.email) {
          await sendPaymentReceipt(userRes.data.user.email, {
            transactionId,
            bookingId,
            amount: payment.amount,
            method: payment.method,
            paidAt: payment.paidAt,
          });
          console.log('[PaymentService] ✅ Payment receipt sent to:', userRes.data.user.email);
        }
      } catch (err) {
        console.error('[PaymentService] Failed to fetch user email for receipt:', err.message);
      }
    }

    res.status(paymentSuccess ? 200 : 402).json({
      success: paymentSuccess,
      message: paymentSuccess
        ? `Payment of $${amount.toFixed(2)} processed successfully.`
        : `Payment failed: ${failureReason}`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/payments/retry/:id
const retryPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });
    
    if (payment.status === 'success') return res.status(409).json({ success: false, message: 'Payment already successful.' });

    let paymentSuccess = true;
    let failureReason = null;

    if (strictPayments && !hasRealStripeKey) {
      return res.status(503).json({
        success: false,
        message: 'Real payment mode is enabled but STRIPE_SECRET_KEY is missing.',
      });
    }

    try {
      if (hasRealStripeKey) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(payment.amount * 100),
          currency: 'usd',
          metadata: { bookingId: payment.bookingId, userId: payment.userId },
        });
        payment.stripePaymentIntentId = paymentIntent.id;
      }
    } catch (stripeErr) {
      paymentSuccess = false;
      failureReason = stripeErr.message;
    }

    payment.status = paymentSuccess ? 'success' : 'failed';
    payment.failureReason = failureReason;
    payment.paidAt = paymentSuccess ? new Date() : null;
    await payment.save();

    res.json({
      success: paymentSuccess,
      message: paymentSuccess ? 'Payment successful on retry.' : `Retry failed: ${failureReason}`,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/payments/booking/:bookingId
const getPaymentByBooking = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId }).sort({ createdAt: -1 });

    if (!payment) return res.status(404).json({ success: false, message: 'No payment found for this booking.' });
    res.json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/payments/user/:userId
const getUserPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const payments = await Payment.find({ userId: req.params.userId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Payment.countDocuments({ userId: req.params.userId });

    const bookingFallback = await fetchCompletedBookings(req.params.userId);
    const merged = mergePaymentsWithBookings(payments, bookingFallback).sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt));
    const paged = merged.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: paged,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: Math.max(total, merged.length), pages: Math.ceil(Math.max(total, merged.length) / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/payments/refund/:id
const refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ transactionId: req.params.id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found.' });

    if (payment.status !== 'success') {
      return res.status(409).json({ success: false, message: 'Only successful payments can be refunded.' });
    }

    // Integrate Stripe Refund if applicable
    if (payment.stripePaymentIntentId && hasRealStripeKey) {
      try {
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
        });
      } catch (stripeErr) {
        return res.status(500).json({ success: false, message: `Stripe Refund Failed: ${stripeErr.message}` });
      }
    }

    payment.status = 'refunded';
    payment.refundedAt = new Date();
    await payment.save();

    res.json({ success: true, message: `Refund of $${payment.amount} processed.`, data: payment });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/payments/admin/revenue
const getRevenueStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = { status: 'success' };
    
    if (startDate || endDate) {
      filter.paidAt = {};
      if (startDate) filter.paidAt.$gte = new Date(startDate);
      if (endDate) filter.paidAt.$lte = new Date(endDate);
    }

    const successfulPayments = await Payment.find(filter);
    const bookingFallback = await fetchCompletedBookings();
    const mergedPayments = mergePaymentsWithBookings(successfulPayments, bookingFallback)
      .filter((payment) => payment.status === 'success' || payment.generatedFromBooking)
      .filter((payment) => {
        if (!startDate && !endDate) return true;
        const paidAt = new Date(payment.paidAt || payment.createdAt || payment.updatedAt || Date.now());
        if (startDate && paidAt < new Date(startDate)) return false;
        if (endDate && paidAt > new Date(endDate)) return false;
        return true;
      });

    let totalRevenue = 0;
    let totalCount = 0;
    const dailyMap = {};
    const methodMap = {};

    mergedPayments.forEach(p => {
      totalRevenue += p.amount;
      totalCount++;

      // Daily grouping
      const paidAtDate = toDate(p.paidAt);
      if (paidAtDate) {
        const dateStr = paidAtDate.toISOString().split('T')[0];
        if (!dailyMap[dateStr]) dailyMap[dateStr] = { revenue: 0, count: 0 };
        dailyMap[dateStr].revenue += p.amount;
        dailyMap[dateStr].count++;
      }

      // Method grouping
      if (!methodMap[p.method]) methodMap[p.method] = { total: 0, count: 0 };
      methodMap[p.method].total += p.amount;
      methodMap[p.method].count++;
    });

    const dailyRevenue = Object.keys(dailyMap)
      .map(k => ({ _id: k, revenue: dailyMap[k].revenue, count: dailyMap[k].count }))
      .sort((a, b) => b._id.localeCompare(a._id))
      .slice(0, 30);

    const methodBreakdown = Object.keys(methodMap)
      .map(k => ({ _id: k, total: methodMap[k].total, count: methodMap[k].count }));

    const recentPayments = mergedPayments
      .sort((a, b) => {
        const bDate = toDate(b.paidAt || b.createdAt) || new Date(0);
        const aDate = toDate(a.paidAt || a.createdAt) || new Date(0);
        return bDate - aDate;
      })
      .slice(0, 5)
      .map((payment) => ({
        transactionId: payment.transactionId,
        bookingId: payment.bookingId,
        amount: payment.amount,
        method: payment.method,
        paidAt: toDate(payment.paidAt) || payment.paidAt,
        generatedFromBooking: !!payment.generatedFromBooking,
      }));

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalTransactions: totalCount,
        averageTransaction: totalCount > 0 ? parseFloat((totalRevenue / totalCount).toFixed(2)) : 0,
        dailyRevenue,
        methodBreakdown,
        recentPayments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/payments/invoice/:bookingId
const getInvoicePdf = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId, status: 'success' }).sort({ paidAt: -1 });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Invoice not found for this booking.' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.bookingId}.pdf`);
    doc.pipe(res);

    doc.fontSize(22).text('ParkIQ Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Transaction ID: ${payment.transactionId}`);
    doc.text(`Booking ID: ${payment.bookingId}`);
    doc.text(`User ID: ${payment.userId}`);
    doc.text(`Amount Paid: $${payment.amount.toFixed(2)}`);
    doc.text(`Method: ${payment.method}`);
    doc.text(`Status: ${payment.status}`);
    doc.text(`Paid At: ${payment.paidAt ? payment.paidAt.toLocaleString() : 'N/A'}`);
    doc.moveDown();
    doc.text('Thank you for using ParkIQ.', { align: 'center' });

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { initiatePayment, retryPayment, getPaymentByBooking, getUserPayments, refundPayment, getRevenueStats, getInvoicePdf };
