const express = require('express');
const {
  getMyLoyaltyPoints,
  earnLoyaltyPoints,
  redeemLoyaltyPoints,
  getLoyaltyHistory,
} = require('../controllers/loyaltyController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/me', protect, getMyLoyaltyPoints);
router.get('/history', protect, getLoyaltyHistory);
router.post('/earn', protect, earnLoyaltyPoints);
router.post('/redeem', protect, redeemLoyaltyPoints);

module.exports = router;