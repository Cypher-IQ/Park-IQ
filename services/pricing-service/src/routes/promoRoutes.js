const express = require('express');
const { body } = require('express-validator');
const {
  validatePromoCode,
  applyPromoCode,
  createPromoCode,
  getAllPromoCodes,
  deactivatePromoCode,
} = require('../controllers/promoController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

const promoValidation = [
  body('code').trim().notEmpty().withMessage('Code is required'),
  body('type').isIn(['percentage', 'fixed', 'free-hours']).withMessage('Invalid promo type'),
  body('discount').isNumeric().withMessage('Discount must be a number'),
  body('startDate').notEmpty().withMessage('Start date is required'),
  body('expiryDate').notEmpty().withMessage('Expiry date is required'),
];

router.post('/validate', protect, validatePromoCode);
router.post('/apply', protect, applyPromoCode);
router.post('/', protect, adminOnly, promoValidation, createPromoCode);
router.get('/', protect, adminOnly, getAllPromoCodes);
router.patch('/:id/deactivate', protect, adminOnly, deactivatePromoCode);

module.exports = router;