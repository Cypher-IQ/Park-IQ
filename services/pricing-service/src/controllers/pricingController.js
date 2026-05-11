const axios = require('axios');
const { peakConfig, getPeakWindowForHour } = require('../config/peakConfig');

const PARKING_SERVICE_URL = process.env.PARKING_SERVICE_URL || 'http://localhost:3002';

/**
 * Core pricing formula:
 * Price = basePrice × durationHours × demandFactor × peakMultiplier × slotTypeMultiplier
 * 
 * demandFactor   = occupiedSlots / totalSlots (min 0.5, max 2.0 to avoid extremes)
 * peakMultiplier = from peakConfig based on hour of day
 */

// Helper: fetch occupancy from parking-service
const fetchOccupancy = async () => {
  try {
    const res = await axios.get(`${PARKING_SERVICE_URL}/api/parking/stats`, { timeout: 5000 });
    return res.data.data;
  } catch {
    // Default if parking-service is down
    return { total: 100, occupied: 50, available: 50 };
  }
};

// Helper: calculate demand factor (clamped 0.5 – 2.0)
const calcDemandFactor = (occupied, total) => {
  if (!total || total === 0) return 1.0;
  const raw = occupied / total;
  return Math.min(2.0, Math.max(0.5, 0.5 + raw * 1.5));
};

// Helper: get peak multiplier for a datetime range
const calcPeakMultiplier = (startTime, endTime) => {
  const startHour = new Date(startTime).getHours();
  const endHour = new Date(endTime).getHours();

  let maxMultiplier = 1.0;
  for (let h = startHour; h <= endHour; h++) {
    const peak = getPeakWindowForHour(h % 24);
    if (peak && peak.multiplier > maxMultiplier) {
      maxMultiplier = peak.multiplier;
    }
  }
  return maxMultiplier;
};

// @route   POST /api/pricing/calculate
// @desc    Calculate parking price for a booking
// @access  Internal
const calculatePrice = async (req, res, next) => {
  try {
    const { slotId, startTime, endTime, slotType = 'standard', durationMinutes } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'startTime and endTime are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = durationMinutes || Math.ceil((end - start) / (1000 * 60));
    const durationHours = Math.max(duration, peakConfig.minChargeDurationMinutes) / 60;

    // Grace period check
    if (duration <= peakConfig.gracePeriodMinutes) {
      return res.json({
        success: true,
        message: 'Within grace period — no charge.',
        data: {
          totalPrice: 0, basePrice: peakConfig.basePrice,
          durationMinutes: duration, gracePeriod: true,
        },
      });
    }

    // Fetch real-time occupancy
    const occupancy = await fetchOccupancy();
    const demandFactor = calcDemandFactor(occupancy.occupied, occupancy.total);
    const peakMultiplier = calcPeakMultiplier(startTime, endTime);
    const slotTypeMultiplier = peakConfig.slotTypeMultipliers[slotType] || 1.0;

    const totalPrice = parseFloat(
      (peakConfig.basePrice * durationHours * demandFactor * peakMultiplier * slotTypeMultiplier).toFixed(2)
    );

    res.json({
      success: true,
      data: {
        totalPrice,
        breakdown: {
          basePrice: peakConfig.basePrice,
          durationHours: parseFloat(durationHours.toFixed(2)),
          durationMinutes: duration,
          demandFactor: parseFloat(demandFactor.toFixed(2)),
          peakMultiplier,
          slotTypeMultiplier,
          occupancyRate: occupancy.occupancyRate,
          formula: `$${peakConfig.basePrice} × ${durationHours.toFixed(2)}h × ${demandFactor.toFixed(2)} (demand) × ${peakMultiplier} (peak) × ${slotTypeMultiplier} (type)`,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/pricing/estimate
// @desc    Quick price estimate (GET with query params)
// @access  Public
const getPriceEstimate = async (req, res, next) => {
  try {
    const { startTime, endTime, slotType } = req.query;
    if (!startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'startTime and endTime query params required.' });
    }
    req.body = { startTime, endTime, slotType };
    return calculatePrice(req, res, next);
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/pricing/peak-hours
// @desc    Get configured peak hours
// @access  Public
const getPeakHours = async (req, res) => {
  res.json({
    success: true,
    data: {
      basePrice: peakConfig.basePrice,
      peakWindows: peakConfig.peakWindows,
      slotTypeMultipliers: peakConfig.slotTypeMultipliers,
      gracePeriodMinutes: peakConfig.gracePeriodMinutes,
    },
  });
};

// @route   GET /api/pricing/current
// @desc    Get current real-time price factor
// @access  Public
const getCurrentPriceFactor = async (req, res, next) => {
  try {
    const now = new Date();
    const occupancy = await fetchOccupancy();
    const demandFactor = calcDemandFactor(occupancy.occupied, occupancy.total);
    const peakWindow = getPeakWindowForHour(now.getHours());
    const peakMultiplier = peakWindow ? peakWindow.multiplier : 1.0;
    const effectiveRate = parseFloat(
      (peakConfig.basePrice * demandFactor * peakMultiplier).toFixed(2)
    );

    res.json({
      success: true,
      data: {
        currentHour: now.getHours(),
        basePrice: peakConfig.basePrice,
        demandFactor: parseFloat(demandFactor.toFixed(2)),
        peakMultiplier,
        effectiveHourlyRate: effectiveRate,
        peakWindow: peakWindow || null,
        occupancy: { rate: occupancy.occupancyRate, occupied: occupancy.occupied, total: occupancy.total },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { calculatePrice, getPriceEstimate, getPeakHours, getCurrentPriceFactor };
