const assert = require('assert');
const mongoose = require('mongoose');
const LoyaltyPoints = require('../src/models/LoyaltyPoints');

function testLoyaltySchema() {
  const points = new LoyaltyPoints({
    userId: new mongoose.Types.ObjectId(),
    points: 600,
    pointsEarned: 600,
    pointsRedeemed: 0,
    tier: 'silver',
    history: [],
  });

  assert.strictEqual(points.tier, 'silver');
  assert.strictEqual(points.pointsEarned, 600);
  assert.strictEqual(points.pointsRedeemed, 0);
}

testLoyaltySchema();
console.log('loyaltyPoints.test.js passed');
