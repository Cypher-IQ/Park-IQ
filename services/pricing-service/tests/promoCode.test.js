const assert = require('assert');
const { calculatePromoDiscount } = require('../src/utils/promoUtils');

function testPromoDiscounts() {
  const percentage = calculatePromoDiscount({ type: 'percentage', discount: 20, maxDiscount: 15 }, 100);
  assert.strictEqual(percentage.discount, 15, 'percentage discount should respect max discount');
  assert.strictEqual(percentage.finalAmount, 85, 'final amount should reflect capped discount');

  const fixed = calculatePromoDiscount({ type: 'fixed', discount: 12 }, 100);
  assert.strictEqual(fixed.discount, 12, 'fixed discount should be applied');
  assert.strictEqual(fixed.finalAmount, 88, 'final amount should subtract fixed discount');

  const freeHours = calculatePromoDiscount({ type: 'free-hours', discount: 2 }, 100);
  assert.strictEqual(freeHours.freeHours, 2, 'free-hours promo should preserve free hours');
}

testPromoDiscounts();
console.log('promoCode.test.js passed');
