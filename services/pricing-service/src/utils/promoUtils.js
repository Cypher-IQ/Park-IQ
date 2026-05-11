const calculatePromoDiscount = (promo, bookingAmount) => {
  if (!promo || bookingAmount === undefined || bookingAmount === null) {
    return { discount: 0, finalAmount: bookingAmount || 0, freeHours: 0 };
  }

  if (promo.type === 'free-hours') {
    return { discount: 0, finalAmount: bookingAmount, freeHours: promo.discount };
  }

  let discount = 0;
  if (promo.type === 'percentage') {
    discount = (bookingAmount * promo.discount) / 100;
    if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
  } else if (promo.type === 'fixed') {
    discount = promo.discount;
  }

  const finalAmount = Math.max(0, bookingAmount - discount);
  return { discount: parseFloat(discount.toFixed(2)), finalAmount: parseFloat(finalAmount.toFixed(2)), freeHours: 0 };
};

module.exports = { calculatePromoDiscount };