const LoyaltyPoints = require('../models/LoyaltyPoints');

const getTierForPoints = (points) => {
  if (points >= 5000) return 'platinum';
  if (points >= 2000) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
};

const getOrCreateLoyaltyRecord = async (userId) => {
  let record = await LoyaltyPoints.findOne({ userId });
  if (!record) {
    record = await LoyaltyPoints.create({ userId, tierSince: new Date() });
  }
  return record;
};

const syncTier = (record) => {
  const nextTier = getTierForPoints(record.pointsEarned);
  if (record.tier !== nextTier) {
    record.tier = nextTier;
    record.tierSince = new Date();
  }
};

const getMyLoyaltyPoints = async (req, res, next) => {
  try {
    const record = await getOrCreateLoyaltyRecord(req.user.id);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

const earnLoyaltyPoints = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user.id;
    const { amount, reason = 'booking_completed', bookingId } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'amount is required.' });
    }

    const pointsToEarn = Math.max(0, Math.floor(Number(amount)));
    const record = await getOrCreateLoyaltyRecord(userId);

    record.points += pointsToEarn;
    record.pointsEarned += pointsToEarn;
    record.history.push({ type: 'earned', points: pointsToEarn, reason, bookingId, date: new Date() });
    syncTier(record);
    await record.save();

    res.json({ success: true, message: 'Loyalty points earned.', data: record });
  } catch (error) {
    next(error);
  }
};

const redeemLoyaltyPoints = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user.id;
    const { points, reason = 'redemption', bookingId } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ success: false, message: 'points must be greater than 0.' });
    }

    const record = await getOrCreateLoyaltyRecord(userId);
    if (record.points < points) {
      return res.status(400).json({ success: false, message: 'Insufficient loyalty points.' });
    }

    record.points -= points;
    record.pointsRedeemed += points;
    record.history.push({ type: 'redeemed', points, reason, bookingId, date: new Date() });
    await record.save();

    res.json({ success: true, message: 'Loyalty points redeemed.', data: record });
  } catch (error) {
    next(error);
  }
};

const getLoyaltyHistory = async (req, res, next) => {
  try {
    const record = await getOrCreateLoyaltyRecord(req.user.id);
    res.json({ success: true, data: record.history });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyLoyaltyPoints, earnLoyaltyPoints, redeemLoyaltyPoints, getLoyaltyHistory };