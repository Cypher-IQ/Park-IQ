const crypto = require('crypto');
const QRCode = require('qrcode');
const axios = require('axios');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');

const isDbConnected = () => mongoose.connection && mongoose.connection.readyState === 1;
const dbUnavailableResponse = (res) => res.status(503).json({ success: false, message: 'Database unavailable; write operations are disabled in development degraded mode.' });
const { sendBookingConfirmation } = require('../services/emailService');

const PARKING_SERVICE_URL = process.env.PARKING_SERVICE_URL || 'http://localhost:3002';
const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001'; // To fetch user email
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret';

const broadcastBookingEvent = async (event, payload) => {
  try {
    await axios.post(`${GATEWAY_URL}/api/realtime/broadcast`, { event, payload }, {
      headers: { 'x-internal-secret': INTERNAL_SECRET },
      timeout: 15000,
    });
  } catch {
    // Best-effort only
  }
};

// Helper: generate QR code
const generateQRCode = async (data) => {
  return await QRCode.toDataURL(JSON.stringify(data), {
    errorCorrectionLevel: 'H',
    width: 300,
    margin: 2,
    color: { dark: '#0A0F1E', light: '#FFFFFF' },
  });
};

// Helper: get estimated price from pricing-service
const getEstimatedPrice = async (slotId, startTime, endTime) => {
  try {
    const response = await axios.post(`${PRICING_SERVICE_URL}/api/pricing/calculate`, {
      slotId, startTime, endTime,
    }, { timeout: 30000 });
    return response.data.data.totalPrice || 0;
  } catch {
    return 0; // Graceful degradation
  }
};

// @route   POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const { slotId, startTime, endTime, vehicleNumber, notes } = req.body;
    const userId = req.headers['x-user-id'] || req.body.userId;

    if (!slotId || !startTime || !endTime || !userId) {
      return res.status(400).json({ success: false, message: 'userId, slotId, startTime, and endTime are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({ success: false, message: 'endTime must be after startTime.' });
    }
    const now = new Date();
    now.setMinutes(now.getMinutes() - 15);
    if (start < now) {
      return res.status(400).json({ success: false, message: 'startTime cannot be in the past.' });
    }

    // Check slot availability from parking-service
    let slotData;
    try {
      const slotRes = await axios.get(`${PARKING_SERVICE_URL}/api/parking/slots/${slotId}`, { timeout: 30000 });
      slotData = slotRes.data.data;
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Failed to verify slot. Slot may not exist.' });
    }

    if (!['available', 'reserved'].includes(slotData.status)) {
      return res.status(409).json({ success: false, message: `Slot ${slotId} is not available. Current status: ${slotData.status}` });
    }

    // Check for overlapping bookings in DB
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const overlap = await Booking.findOne({
      slotId: slotId.toUpperCase(),
      status: { $in: ['pending', 'confirmed', 'active'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (overlap) {
      return res.status(409).json({ success: false, message: 'This slot is already booked for the selected time.' });
    }

    // Generate unique booking ID and QR token
    const bookingId = `BK-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const qrToken = crypto.randomUUID();

    // Generate QR code
    const qrData = { bookingId, qrToken, slotId, userId };
    const qrCode = await generateQRCode(qrData);

    // Get price estimate
    const estimatedPrice = await getEstimatedPrice(slotId, startTime, endTime);

    // Reserve slot in parking-service
    await axios.patch(`${PARKING_SERVICE_URL}/api/parking/slots/${slotId}/status`, {
      status: 'reserved',
      bookingId,
    }, { timeout: 30000 }).catch(() => {});

    // Create booking in DB
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const newBooking = await Booking.create({
      bookingId, userId, slotId: slotId.toUpperCase(),
      startTime: start, endTime: end,
      qrCode, qrToken, estimatedPrice,
      paymentStatus: 'pending',
      vehicleNumber, notes,
      status: 'confirmed',
    });

    broadcastBookingEvent('booking:update', {
      type: 'created',
      bookingId: newBooking.bookingId,
      slotId: newBooking.slotId,
      userId,
      status: newBooking.status,
    });

    // Try to get user email to send confirmation
    try {
      // Create a dummy token for internal auth if needed, or assume internal calls are allowed
      // The user service doesn't have a direct "get user by id without auth" route by default,
      // but we will try to fetch the email from the frontend request if it's there.
      // Alternatively, we could update user-service to support internal fetching.
      // For now, let's just attempt to call emailService with req.body.email if passed.
      const userEmail = req.body.email || 'user@example.com';
      await sendBookingConfirmation(userEmail, qrCode, newBooking);
    } catch (err) {
      console.error('Failed to send email confirmation', err);
    }

    res.status(201).json({
      success: true,
      message: 'Booking confirmed! Your QR code is ready.',
      data: newBooking,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/bookings
const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'] || req.query.userId;
    const { status, page = 1, limit = 10 } = req.query;

    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });

    let filter = { userId };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    if (!isDbConnected()) {
      return res.json({ success: true, degradedMode: true, data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 } });
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/bookings/:id
const getBookingById = async (req, res, next) => {
  try {
    if (!isDbConnected()) return res.json({ success: true, degradedMode: true, data: null });

    const booking = await Booking.findOne({ bookingId: req.params.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/bookings/entry
const scanEntry = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ success: false, message: 'QR token is required.' });
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const booking = await Booking.findOne({ qrToken });
    if (!booking) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    if (booking.status === 'active') {
      return res.status(409).json({ success: false, message: 'Vehicle already checked in.' });
    }
    if (!['confirmed', 'pending'].includes(booking.status)) {
      return res.status(409).json({ success: false, message: `Cannot check in. Booking status: ${booking.status}` });
    }

    const now = new Date();
    booking.status = 'active';
    booking.entryTime = now;
    await booking.save();

    // Update slot to occupied
    await axios.patch(`${PARKING_SERVICE_URL}/api/parking/slots/${booking.slotId}/status`, {
      status: 'occupied', bookingId: booking.bookingId,
    }, { timeout: 30000 }).catch(() => {});

    res.json({
      success: true,
      message: `Welcome! Entry recorded for slot ${booking.slotId}.`,
      data: { bookingId: booking.bookingId, slotId: booking.slotId, entryTime: booking.entryTime },
    });

    broadcastBookingEvent('booking:update', {
      type: 'entry',
      bookingId: booking.bookingId,
      slotId: booking.slotId,
      status: booking.status,
      entryTime: booking.entryTime,
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/bookings/exit
const scanExit = async (req, res, next) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ success: false, message: 'QR token is required.' });
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const booking = await Booking.findOne({ qrToken });
    if (!booking) return res.status(404).json({ success: false, message: 'Invalid QR code.' });

    if (booking.status !== 'active') {
      return res.status(409).json({ success: false, message: `Cannot check out. Booking status: ${booking.status}` });
    }

    const now = new Date();
    booking.exitTime = now;
    booking.durationMinutes = Math.ceil((now - booking.entryTime) / (1000 * 60));

    // Get final price from pricing-service
    try {
      const priceRes = await axios.post(`${PRICING_SERVICE_URL}/api/pricing/calculate`, {
        slotId: booking.slotId,
        startTime: booking.entryTime,
        endTime: now,
        durationMinutes: booking.durationMinutes,
      }, { timeout: 30000 });
      booking.finalPrice = priceRes.data.data.totalPrice || booking.estimatedPrice;
    } catch {
      booking.finalPrice = booking.estimatedPrice;
    }

    booking.status = 'completed';
    await booking.save();

    // Auto-create a payment record so completed fare appears in payment dashboards.
    try {
      const paymentRes = await axios.post(`${PAYMENT_SERVICE_URL}/api/payments/initiate`, {
        bookingId: booking.bookingId,
        userId: booking.userId,
        amount: Number(booking.finalPrice || 0),
        method: 'auto-exit',
      }, { timeout: 30000 });

      if (paymentRes?.data?.success) {
        booking.paymentStatus = 'paid';
        booking.paymentTransactionId = paymentRes.data.data?.transactionId || booking.paymentTransactionId;
        booking.paymentCompletedAt = paymentRes.data.data?.paidAt || new Date();
        await booking.save();
      }
    } catch (err) {
      console.error('[BookingService] Auto payment creation failed:', err.message);
    }

    // Free up parking slot
    await axios.patch(`${PARKING_SERVICE_URL}/api/parking/slots/${booking.slotId}/status`, {
      status: 'available', bookingId: null,
    }, { timeout: 30000 }).catch(() => {});

    res.json({
      success: true,
      message: `Exit recorded. Duration: ${booking.durationMinutes} min. Amount due: $${booking.finalPrice.toFixed(2)}`,
      data: {
        bookingId: booking.bookingId,
        slotId: booking.slotId,
        entryTime: booking.entryTime,
        exitTime: booking.exitTime,
        durationMinutes: booking.durationMinutes,
        finalPrice: booking.finalPrice,
      },
    });

    broadcastBookingEvent('booking:update', {
      type: 'exit',
      bookingId: booking.bookingId,
      slotId: booking.slotId,
      status: booking.status,
      exitTime: booking.exitTime,
      finalPrice: booking.finalPrice,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const booking = await Booking.findOne({ bookingId: req.params.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(409).json({ success: false, message: `Booking is already ${booking.status}.` });
    }

    const prevStatus = booking.status;
    booking.status = 'cancelled';
    await booking.save();

    if (['confirmed', 'pending', 'active'].includes(prevStatus)) {
      await axios.patch(`${PARKING_SERVICE_URL}/api/parking/slots/${booking.slotId}/status`, {
        status: 'available', bookingId: null,
    }, { timeout: 30000 }).catch(() => {});
    }

    broadcastBookingEvent('booking:update', {
      type: 'cancelled',
      bookingId: booking.bookingId,
      slotId: booking.slotId,
      status: booking.status,
    });

    res.json({ success: true, message: 'Booking cancelled successfully.', data: booking });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/bookings/admin/all
const getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20, startDate, endDate } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/bookings/admin/stats
const getBookingStats = async (req, res, next) => {
  try {
    const total = await Booking.countDocuments();
    
    const statuses = await Booking.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const stats = { total };
    statuses.forEach(s => {
      stats[s._id] = s.count;
    });

    const recentBookings = await Booking.find({ status: { $in: ['completed', 'active'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('bookingId slotId userId status finalPrice createdAt');

    res.json({ success: true, data: { stats, recentBookings } });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/bookings/:id/receipt
const generateReceipt = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findOne({ bookingId });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${booking.bookingId}.pdf`);
    doc.pipe(res);

    // Styled header and layout
    const { width, height } = doc.page;
    // Outer border
    doc.save();
    doc.lineWidth(1).strokeColor('#E6EDF0').rect(20, 20, width - 40, height - 40).stroke();

    // Header band
    const headerHeight = 90;
    doc.rect(20, 20, width - 40, headerHeight).fill('#0EA5A4');

    // Draw a simple vector logo using PDFKit primitives (avoid svg-to-pdfkit)
    // small rounded rect background
    doc.save();
    doc.roundedRect = function(x, y, w, h, r) { this.moveTo(x + r, y).lineTo(x + w - r, y).quadraticCurveTo(x + w, y, x + w, y + r).lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h).lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r).lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y); return this; };
    doc.fillColor('#00D4FF').opacity(0.15).roundedRect(34, 30, 44, 44, 8).fill();
    doc.opacity(1).strokeColor('#00D4FF').lineWidth(1).roundedRect(34, 30, 44, 44, 8).stroke();

    // 'P' path (approx)
    doc.strokeColor('#00D4FF').lineWidth(3.5).moveTo(44, 62).lineTo(44, 40).lineTo(54, 40).bezierCurveTo(58,40,62,44,62,48).stroke();

    // car body
    doc.roundedRect(44, 66, 28, 8, 3).fill('#22E5FF');
    doc.moveTo(48,66).lineTo(51,60).lineTo(65,60).lineTo(68,66).fill('#22E5FF');

    // wheels
    doc.circle(50, 78.5, 3).fill('#0A0F1E');
    doc.circle(66, 78.5, 3).fill('#0A0F1E');

    // Title text on header
    doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('Smart Parking — Receipt', 110, 48);

    // Company contact
    doc.fontSize(9).font('Helvetica').fillColor('#FFFFFF').text('ParkIQ — 123 Parking Ave, Suite 100', width - 260, 36, { width: 220, align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#FFFFFF').text('support@parkiq.com | +1 (555) 123-4567', width - 260, 52, { width: 220, align: 'right' });

    doc.restore();
    doc.fillColor('#0F1724');
    const bodyTop = 20 + headerHeight + 20;

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text('Booking Receipt', 40, bodyTop);

    // Booking key/value pairs (left column)
    const leftX = 40;
    let y = bodyTop + 28;
    const lineGap = 16;
    const start = booking.startTime ? new Date(booking.startTime).toLocaleString() : 'N/A';
    const end = booking.endTime ? new Date(booking.endTime).toLocaleString() : 'N/A';

    const rows = [
      ['Booking ID', booking.bookingId],
      ['User ID', booking.userId || 'N/A'],
      ['Vehicle', booking.vehicleNumber || 'N/A'],
      ['Slot', booking.slotId || 'N/A'],
      ['Start', start],
      ['End', end],
      ['Status', booking.status],
    ];

    doc.fontSize(10).font('Helvetica');
    rows.forEach(([label, value]) => {
      doc.fillColor('#6B7280').text(label, leftX, y);
      doc.fillColor('#0F1724').font('Helvetica-Bold').text(String(value), leftX + 120, y);
      y += lineGap;
      doc.font('Helvetica');
    });

    // Price box
    const price = (booking.finalPrice != null) ? booking.finalPrice : (booking.estimatedPrice != null ? booking.estimatedPrice : 0);
    const priceBoxY = bodyTop + 6;
    const priceBoxX = width - 220;
    doc.roundedRect = function(x, y, w, h, r) { this.moveTo(x + r, y).lineTo(x + w - r, y).quadraticCurveTo(x + w, y, x + w, y + r).lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h).lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r).lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y); return this; };
    doc.save();
    doc.fillColor('#F5F3FF').rect(priceBoxX, priceBoxY, 160, 60).fill();
    doc.fillColor('#7C3AED').fontSize(10).font('Helvetica').text('Amount Paid', priceBoxX + 12, priceBoxY + 10);
    doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold').text(`$${Number(price).toFixed(2)}`, priceBoxX + 12, priceBoxY + 28);
    doc.restore();

    // QR Code on right if available
    if (booking.qrCode && booking.qrCode.startsWith('data:image')) {
      const matches = booking.qrCode.match(/^data:image\/(png|jpeg);base64,(.+)$/);
      if (matches && matches[2]) {
        const img = Buffer.from(matches[2], 'base64');
        try {
          const imgX = width - 150;
          const imgY = y - (rows.length * lineGap) + 6;
          doc.image(img, imgX, imgY, { fit: [110, 110], align: 'right' });
        } catch (err) {
          // ignore image errors
        }
      }
    }

    // Footer
    doc.fontSize(9).fillColor('#6B7280').font('Helvetica').text('Thank you for using ParkIQ — Visit the dashboard for more details.', 40, height - 80, { width: width - 80, align: 'center' });

    doc.restore();

    doc.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking, getUserBookings, getBookingById,
  scanEntry, scanExit, cancelBooking,
  getAllBookings, getBookingStats,
  generateReceipt,
};
