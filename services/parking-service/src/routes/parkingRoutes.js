const express = require('express');
const {
  getAllSlots, getSlotById, createSlot, createSlotsBulk,
  updateSlotStatus, updateSlot, deleteSlot,
  getNearestSlot, getStats, getZoneStats, seedSlots,
} = require('../controllers/parkingController');

const router = express.Router();

// Stats routes (before /:id to avoid conflicts)
router.get('/stats', getStats);
router.get('/zones', getZoneStats);
router.get('/nearest', getNearestSlot);

// CRUD routes
router.get('/slots', getAllSlots);
router.post('/slots/seed', seedSlots);        // ← must be BEFORE /slots/:id
router.post('/slots/bulk', createSlotsBulk);  // ← must be BEFORE /slots/:id
router.get('/slots/:id', getSlotById);
router.post('/slots', createSlot);
router.put('/slots/:id', updateSlot);
router.patch('/slots/:id/status', updateSlotStatus);
router.delete('/slots/:id', deleteSlot);

module.exports = router;
