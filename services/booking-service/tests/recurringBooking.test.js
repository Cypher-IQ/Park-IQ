const assert = require('assert');
const RecurringBooking = require('../src/models/RecurringBooking');

function testRecurringHelpers() {
  const recurring = new RecurringBooking({
    userId: '507f1f77bcf86cd799439011',
    slotId: 'A101',
    frequency: 'daily',
    startTime: '09:00',
    endTime: '11:00',
    recurrenceStartDate: new Date(Date.now() - 86400000),
    isActive: true,
    occurrencesCreated: 0,
  });

  assert.strictEqual(recurring.shouldCreateNextBooking(), true, 'daily recurring booking should be schedulable');
  const next = recurring.getNextBookingDate();
  assert.ok(next instanceof Date, 'next booking date should be a Date');
}

testRecurringHelpers();
console.log('recurringBooking.test.js passed');
