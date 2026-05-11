/**
 * Peak Hours Configuration
 * Times are in 24-hour format (hour only)
 * 
 * Default peak windows:
 *   Morning:  08:00 - 10:00 (multiplier 1.5x)
 *   Evening:  17:00 - 20:00 (multiplier 1.5x)
 *   Night:    22:00 - 23:59 (multiplier 0.8x — discount)
 */

const peakConfig = {
  basePrice: parseFloat(process.env.BASE_PRICE) || 2.0, // USD per hour

  peakWindows: [
    { name: 'Morning Rush',  startHour: 8,  endHour: 10, multiplier: 1.5 },
    { name: 'Evening Rush',  startHour: 17, endHour: 20, multiplier: 1.5 },
    { name: 'Late Night',    startHour: 22, endHour: 24, multiplier: 0.8 },
  ],

  slotTypeMultipliers: {
    standard: 1.0,
    compact: 0.85,
    'ev-charging': 1.4,
    handicapped: 0.9,
  },

  minChargeDurationMinutes: 15, // Minimum billable duration
  gracePeriodMinutes: 10,       // No charge within grace period
};

/**
 * Detects which peak window (if any) the given hour falls in
 * @param {number} hour - 0-23
 * @returns {object|null} peak window config or null
 */
const getPeakWindowForHour = (hour) => {
  return peakConfig.peakWindows.find(w => hour >= w.startHour && hour < w.endHour) || null;
};

module.exports = { peakConfig, getPeakWindowForHour };
