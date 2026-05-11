const RecurringBooking = require('../models/RecurringBooking');

const computeNextDate = (recurring) => {
  const baseDate = new Date(recurring.nextScheduledDate || recurring.recurrenceStartDate);
  const now = new Date();
  let candidate = new Date(baseDate);

  if (recurring.frequency === 'daily') {
    if (candidate <= now) candidate.setDate(now.getDate() + 1);
    while (candidate < now) candidate.setDate(candidate.getDate() + 1);
  } else if (recurring.frequency === 'weekly') {
    const daysOfWeek = Array.isArray(recurring.daysOfWeek) && recurring.daysOfWeek.length > 0
      ? recurring.daysOfWeek
      : [candidate.getDay()];
    candidate = new Date(now);
    candidate.setHours(0, 0, 0, 0);
    let found = null;
    for (let i = 0; i < 14; i += 1) {
      const check = new Date(candidate);
      check.setDate(check.getDate() + i);
      if (daysOfWeek.includes(check.getDay()) && check >= now) {
        found = check;
        break;
      }
    }
    candidate = found || candidate;
  } else if (recurring.frequency === 'monthly') {
    const day = recurring.dateOfMonth || candidate.getDate();
    candidate = new Date(now);
    candidate.setDate(day);
    if (candidate < now) candidate.setMonth(candidate.getMonth() + 1);
  } else if (recurring.frequency === 'custom') {
    const nextCustom = (recurring.customDays || []).map((d) => new Date(d)).sort((a, b) => a - b).find((d) => d >= now);
    return nextCustom || null;
  }

  if (recurring.recurrenceEndDate && candidate > recurring.recurrenceEndDate) return null;
  return candidate;
};

const computeDurationMinutes = (startTime, endTime) => {
  const start = new Date(`1970-01-01T${startTime}:00Z`);
  const end = new Date(`1970-01-01T${endTime}:00Z`);
  return Math.max(0, Math.round((end - start) / 60000));
};

const createRecurringBooking = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.user.id;
    const {
      slotId,
      frequency,
      daysOfWeek,
      dateOfMonth,
      customDays,
      startTime,
      endTime,
      recurrenceStartDate,
      recurrenceEndDate,
      maxOccurrences,
      autoRenew = true,
      cancelIfConflict = true,
      notifyBefore = 24,
      notes,
    } = req.body;

    if (!slotId || !frequency || !startTime || !endTime || !recurrenceStartDate) {
      return res.status(400).json({ success: false, message: 'slotId, frequency, startTime, endTime, and recurrenceStartDate are required.' });
    }

    const recurring = await RecurringBooking.create({
      userId,
      slotId,
      frequency,
      daysOfWeek,
      dateOfMonth,
      customDays,
      startTime,
      endTime,
      duration: computeDurationMinutes(startTime, endTime),
      recurrenceStartDate: new Date(recurrenceStartDate),
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      maxOccurrences,
      autoRenew,
      cancelIfConflict,
      notifyBefore,
      notes,
      nextScheduledDate: computeNextDate({
        frequency,
        daysOfWeek,
        dateOfMonth,
        customDays,
        recurrenceStartDate: new Date(recurrenceStartDate),
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
      }),
    });

    res.status(201).json({ success: true, message: 'Recurring booking created.', data: recurring });
  } catch (error) {
    next(error);
  }
};

const getRecurringBookings = async (req, res, next) => {
  try {
    const bookings = await RecurringBooking.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

const getRecurringBookingById = async (req, res, next) => {
  try {
    const recurring = await RecurringBooking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!recurring) return res.status(404).json({ success: false, message: 'Recurring booking not found.' });
    res.json({ success: true, data: recurring });
  } catch (error) {
    next(error);
  }
};

const updateRecurringBooking = async (req, res, next) => {
  try {
    const recurring = await RecurringBooking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!recurring) return res.status(404).json({ success: false, message: 'Recurring booking not found.' });

    const updatableFields = [
      'slotId', 'frequency', 'daysOfWeek', 'dateOfMonth', 'customDays',
      'startTime', 'endTime', 'recurrenceStartDate', 'recurrenceEndDate',
      'maxOccurrences', 'autoRenew', 'cancelIfConflict', 'notifyBefore', 'notes', 'isActive'
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) recurring[field] = req.body[field];
    });

    recurring.updatedAt = new Date();
    recurring.nextScheduledDate = computeNextDate(recurring);
    await recurring.save();

    res.json({ success: true, message: 'Recurring booking updated.', data: recurring });
  } catch (error) {
    next(error);
  }
};

const cancelRecurringBooking = async (req, res, next) => {
  try {
    const recurring = await RecurringBooking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!recurring) return res.status(404).json({ success: false, message: 'Recurring booking not found.' });

    recurring.isActive = false;
    recurring.updatedAt = new Date();
    await recurring.save();

    res.json({ success: true, message: 'Recurring booking cancelled.', data: recurring });
  } catch (error) {
    next(error);
  }
};

const processRecurringBooking = async (req, res, next) => {
  try {
    const recurring = await RecurringBooking.findOne({ _id: req.params.id, userId: req.user.id });
    if (!recurring) return res.status(404).json({ success: false, message: 'Recurring booking not found.' });

    recurring.lastProcessed = new Date();
    recurring.occurrencesCreated += 1;
    recurring.nextScheduledDate = computeNextDate(recurring);
    if (!recurring.nextScheduledDate) recurring.isActive = false;
    await recurring.save();

    res.json({ success: true, message: 'Recurring booking processed.', data: recurring });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRecurringBooking,
  getRecurringBookings,
  getRecurringBookingById,
  updateRecurringBooking,
  cancelRecurringBooking,
  processRecurringBooking,
};