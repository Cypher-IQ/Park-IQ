const express = require('express');
const { calculatePrice, getPriceEstimate, getPeakHours, getCurrentPriceFactor } = require('../controllers/pricingController');
const promoRoutes = require('./promoRoutes');

const router = express.Router();

router.post('/calculate', calculatePrice);
router.get('/estimate', getPriceEstimate);
router.get('/peak-hours', getPeakHours);
router.get('/current', getCurrentPriceFactor);
router.use('/promo', promoRoutes);

module.exports = router;
