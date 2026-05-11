const PromoCode = require('../models/PromoCode');
const { calculatePromoDiscount } = require('../utils/promoUtils');

// Validate promo code
const validatePromoCode = async (req, res, next) => {
  try {
    const { code, userId, bookingAmount } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Promo code is required.' });

    const promo = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found.' });
    }

    const validity = promo.isValid(userId);
    if (!validity.valid) {
      return res.status(400).json({ success: false, message: validity.reason });
    }

    if (bookingAmount && bookingAmount < promo.minBookingAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking amount required: $${promo.minBookingAmount}`,
      });
    }

    // Calculate discount
    const discountResult = calculatePromoDiscount(promo, bookingAmount || 0);

    if (promo.type === 'free-hours') {
      // Returns hours, not monetary discount
      return res.json({
        success: true,
        data: {
          code,
          type: 'free-hours',
          freeHours: discountResult.freeHours,
          description: promo.description,
        },
      });
    }

    res.json({
      success: true,
      data: {
        code,
        type: promo.type,
        discount: discountResult.discount,
        finalAmount: discountResult.finalAmount,
        description: promo.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Apply promo code (increase usage count)
const applyPromoCode = async (req, res, next) => {
  try {
    const { code, userId, bookingId } = req.body;
    if (!code || !userId) return res.status(400).json({ success: false, message: 'Code and userId required.' });

    const promo = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo code not found.' });

    const validity = promo.isValid(userId);
    if (!validity.valid) return res.status(400).json({ success: false, message: validity.reason });

    // Update usage
    promo.usageCount += 1;
    const userUsage = promo.users.find(u => u.userId.toString() === userId.toString());
    if (userUsage) {
      userUsage.count += 1;
      userUsage.lastUsed = new Date();
    } else {
      promo.users.push({ userId, count: 1, lastUsed: new Date() });
    }
    await promo.save();

    res.json({ success: true, message: 'Promo code applied successfully.' });
  } catch (error) {
    next(error);
  }
};

// Admin: Create promo code
const createPromoCode = async (req, res, next) => {
  try {
    const { code, type, discount, minBookingAmount, startDate, expiryDate, usageLimit, description } = req.body;

    if (!code || !type || discount === undefined) {
      return res.status(400).json({ success: false, message: 'Code, type, and discount are required.' });
    }

    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(409).json({ success: false, message: 'Promo code already exists.' });
    }

    const promo = await PromoCode.create({
      code: code.toUpperCase(),
      type,
      discount: parseFloat(discount),
      minBookingAmount: parseFloat(minBookingAmount) || 0,
      startDate: new Date(startDate),
      expiryDate: new Date(expiryDate),
      usageLimit: usageLimit || null,
      description,
      createdBy: req.user?.id,
    });

    res.status(201).json({ success: true, message: 'Promo code created.', data: promo });
  } catch (error) {
    next(error);
  }
};

// Admin: Get all promo codes
const getAllPromoCodes = async (req, res, next) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const codes = await PromoCode.find(filter).skip(skip).limit(parseInt(limit));
    const total = await PromoCode.countDocuments(filter);

    res.json({
      success: true,
      data: codes,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Deactivate promo code
const deactivatePromoCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const promo = await PromoCode.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!promo) return res.status(404).json({ success: false, message: 'Promo code not found.' });

    res.json({ success: true, message: 'Promo code deactivated.', data: promo });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validatePromoCode,
  applyPromoCode,
  createPromoCode,
  getAllPromoCodes,
  deactivatePromoCode,
};
