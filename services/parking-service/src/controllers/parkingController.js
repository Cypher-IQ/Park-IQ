const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const Slot = require('../models/Slot');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret';

const FALLBACK_SLOTS = (() => {
  const zones = ['A', 'B', 'C', 'D', 'E'];
  const types = ['standard', 'standard', 'standard', 'compact', 'ev-charging', 'handicapped'];
  const slots = [];

  zones.forEach((zone) => {
    for (let level = 1; level <= 2; level++) {
      for (let num = 1; num <= 10; num++) {
        const slotId = `${zone}${level}${String(num).padStart(2, '0')}`;
        slots.push({
          slotId,
          zone,
          level,
          slotNumber: num,
          type: types[(num + level) % types.length],
          status: 'available',
          location: {
            lat: 12.9716,
            lng: 77.5946,
            description: `Zone ${zone}, Level ${level}, Slot ${num}`,
          },
          features: { covered: level > 1, cctv: true },
          currentBookingId: null,
          lastStatusChange: new Date(0),
        });
      }
    }
  });

  return slots;
})();

const isDbConnected = () => mongoose.connection.readyState === 1;

const getFilteredFallbackSlots = (query = {}) => {
  const { status, zone, level } = query;
  return FALLBACK_SLOTS.filter((slot) => {
    if (status && slot.status !== status) return false;
    if (zone && slot.zone !== String(zone).toUpperCase()) return false;
    if (level && slot.level !== parseInt(level, 10)) return false;
    return true;
  });
};

const dbUnavailableResponse = (res) => {
  return res.status(503).json({
    success: false,
    message: 'Database unavailable. This operation requires MongoDB.',
  });
};

const broadcastParkingUpdate = async (payload) => {
  try {
    await axios.post(`${GATEWAY_URL}/api/realtime/broadcast`, payload, {
      headers: { 'x-internal-secret': INTERNAL_SECRET },
      timeout: 5000,
    });
  } catch {
    // Best-effort real-time update
  }
};

// Helper: Calculate Occupancy Stats
const calculateOccupancyStats = async () => {
  const stats = { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 };

  const slots = isDbConnected() ? await Slot.find() : FALLBACK_SLOTS;
  
  slots.forEach(slot => {
    if (stats[slot.status] !== undefined) {
      stats[slot.status]++;
    }
    stats.total++;
  });

  stats.occupancyRate = stats.total > 0
    ? Math.round(((stats.occupied + stats.reserved) / stats.total) * 100)
    : 0;

  return stats;
};

// @route   GET /api/parking/slots
const getAllSlots = async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      const slots = getFilteredFallbackSlots(req.query);
      return res.json({
        success: true,
        count: slots.length,
        data: slots,
        degradedMode: true,
      });
    }

    const { status, zone, level } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (zone) filter.zone = zone.toUpperCase();
    if (level) filter.level = parseInt(level, 10);

    const slots = await Slot.find(filter).sort({ slotId: 1 });

    res.json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/parking/slots/:id
const getSlotById = async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      const slot = FALLBACK_SLOTS.find(
        (s) => s.slotId === req.params.id || s._id === req.params.id
      );
      if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });
      return res.json({ success: true, data: slot, degradedMode: true });
    }

    const slot = await Slot.findOne({ $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slotId: req.params.id }] });
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/parking/slots
const createSlot = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const { slotId, zone, level, slotNumber, type, location, features } = req.body;

    const existingSlot = await Slot.findOne({ slotId });
    if (existingSlot) {
      return res.status(409).json({ success: false, message: 'Slot ID already exists.' });
    }

    const newSlot = await Slot.create({
      slotId,
      zone,
      level,
      slotNumber,
      type: type || 'standard',
      status: 'available',
      location: location || { lat: 0, lng: 0, description: '' },
      features: features || { covered: false, cctv: true },
    });

    res.status(201).json({ success: true, message: 'Slot created.', data: newSlot });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/parking/slots/bulk
const createSlotsBulk = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const { slots: newSlots } = req.body;
    if (!Array.isArray(newSlots) || newSlots.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of slots.' });
    }

    const created = [];
    for (const data of newSlots) {
      const existingSlot = await Slot.findOne({ slotId: data.slotId });
      if (!existingSlot) {
        const slot = await Slot.create({
          status: 'available',
          ...data
        });
        created.push(slot);
      }
    }

    res.status(201).json({
      success: true,
      message: `${created.length} slots created.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

// @route   PATCH /api/parking/slots/:id/status
const updateSlotStatus = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const { status, bookingId } = req.body;
    const validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const slot = await Slot.findOne({ $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slotId: req.params.id }] });
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    slot.status = status;
    slot.lastStatusChange = new Date();

    if (status === 'available' || status === 'maintenance') {
      slot.currentBookingId = null;
    } else if (bookingId) {
      slot.currentBookingId = bookingId;
    }

    const updatedSlot = await slot.save();

    broadcastParkingUpdate({
      event: 'parking:update',
      payload: { type: 'slot-status', slotId: updatedSlot.slotId, status: updatedSlot.status, bookingId: updatedSlot.currentBookingId },
    });

    res.json({ success: true, message: 'Status updated.', data: updatedSlot });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/parking/slots/:id
const updateSlot = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const slot = await Slot.findOne({ $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slotId: req.params.id }] });
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    Object.assign(slot, req.body);
    const updatedSlot = await slot.save();

    broadcastParkingUpdate({
      event: 'parking:update',
      payload: { type: 'slot-updated', slotId: updatedSlot.slotId, status: updatedSlot.status },
    });

    res.json({ success: true, message: 'Slot updated.', data: updatedSlot });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/parking/slots/:id
const deleteSlot = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    const slot = await Slot.findOneAndDelete({ $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slotId: req.params.id }] });
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    broadcastParkingUpdate({
      event: 'parking:update',
      payload: { type: 'slot-deleted', slotId: slot.slotId },
    });

    res.json({ success: true, message: 'Slot deleted.' });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/parking/nearest
const getNearestSlot = async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      const slot = FALLBACK_SLOTS.find((s) => s.status === 'available');
      if (!slot) return res.status(404).json({ success: false, message: 'No available slots found.' });
      return res.json({ success: true, data: slot, degradedMode: true });
    }

    const slot = await Slot.findOne({ status: 'available' });
    if (!slot) return res.status(404).json({ success: false, message: 'No available slots found.' });
    
    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/parking/stats
const getStats = async (req, res, next) => {
  try {
    const stats = await calculateOccupancyStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/parking/zones
const getZoneStats = async (req, res, next) => {
  try {
    const slots = isDbConnected() ? await Slot.find() : FALLBACK_SLOTS;
    const zoneStats = {};
    
    slots.forEach(slot => {
      const z = slot.zone;
      if (!zoneStats[z]) {
        zoneStats[z] = { zone: z, total: 0, available: 0, occupied: 0, reserved: 0 };
      }
      zoneStats[z].total++;
      if (zoneStats[z][slot.status] !== undefined) {
        zoneStats[z][slot.status]++;
      }
    });

    const data = Object.values(zoneStats).map(z => ({
      ...z,
      occupancyRate: z.total > 0 ? Math.round(((z.occupied + z.reserved) / z.total) * 100) : 0
    })).sort((a, b) => a.zone.localeCompare(b.zone));

    res.json({ success: true, data, degradedMode: !isDbConnected() });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/parking/slots/seed
const seedSlots = async (req, res, next) => {
  try {
    if (!isDbConnected()) return dbUnavailableResponse(res);

    await Slot.deleteMany({}); // Clear existing slots

    const zones = ['A', 'B', 'C', 'D', 'E'];
    const types = ['standard', 'standard', 'standard', 'compact', 'ev-charging', 'handicapped'];
    const newSlots = [];

    zones.forEach((zone) => {
      for (let level = 1; level <= 2; level++) {
        for (let num = 1; num <= 10; num++) {
          const slotId = `${zone}${level}${String(num).padStart(2, '0')}`;
          newSlots.push({
            slotId,
            zone,
            level,
            slotNumber: num,
            type: types[Math.floor(Math.random() * types.length)],
            status: 'available',
            location: {
              lat: 12.9716 + (Math.random() * 0.01 - 0.005),
              lng: 77.5946 + (Math.random() * 0.01 - 0.005),
              description: `Zone ${zone}, Level ${level}, Slot ${num}`,
            },
            features: { covered: level > 1, cctv: true },
          });
        }
      }
    });

    await Slot.insertMany(newSlots);
    const slotsCount = await Slot.countDocuments();
    const stats = await calculateOccupancyStats();

    res.status(201).json({
      success: true,
      message: `${slotsCount} parking slots seeded across 5 zones (A-E).`,
      data: { count: slotsCount, stats },
    });

    broadcastParkingUpdate({
      event: 'parking:update',
      payload: { type: 'seeded', stats },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSlots, getSlotById, createSlot, createSlotsBulk,
  updateSlotStatus, updateSlot, deleteSlot,
  getNearestSlot, getStats, getZoneStats, seedSlots,
};
