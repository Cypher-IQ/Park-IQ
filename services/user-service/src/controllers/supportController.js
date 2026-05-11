const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const SupportThread = require('../models/SupportThread');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'parkiq-internal-secret';

const SUPPORT_CATEGORIES = {
  payment_issue: 'Payment Issue',
  qr_code_issue: 'QR Code Issue',
  refund_issue: 'Refund Issue',
  entry_exit_issue: 'Parking Entry/Exit Issue',
  slot_booking_issue: 'Slot Booking Issue',
  vehicle_number_issue: 'Vehicle Number Issue',
  other: 'Other Issue',
};

const broadcastSupportEvent = async (event, payload) => {
  try {
    await axios.post(`${GATEWAY_URL}/api/realtime/broadcast`, { event, payload }, {
      headers: { 'x-internal-secret': INTERNAL_SECRET },
      timeout: 5000,
    });
  } catch (err) {
    console.error('[SupportController] Broadcast failed:', err.message);
    // best effort - don't throw
  }
};

const makeTicketId = () => `TKT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

const normalizeMessage = (message) => {
  try {
    const item = message.toObject ? message.toObject() : message;
    return {
      ...item,
      isRead: Array.isArray(item.readBy) && item.readBy.length > 0,
    };
  } catch (err) {
    console.error('[SupportController] Error normalizing message:', err.message);
    return message;
  }
};

const normalizeAdminThread = (thread) => {
  try {
    const item = thread.toObject ? thread.toObject() : thread;
    const messages = Array.isArray(item.messages) ? item.messages : [];
    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    return {
      ...item,
      isSlaBreached: item.slaDueAt ? new Date(item.slaDueAt) < new Date() && item.status !== 'closed' : false,
      lastMessage: lastMsg ? normalizeMessage(lastMsg) : null,
    };
  } catch (err) {
    console.error('[SupportController] Error normalizing thread:', err.message);
    return thread;
  }
};

const ensureThreadDefaults = async (thread) => {
  let mutated = false;
  if (!thread.ticketId) {
    thread.ticketId = makeTicketId();
    mutated = true;
  }
  if (!thread.category) {
    thread.category = 'other';
    mutated = true;
  }
  if (!thread.subject) {
    thread.subject = SUPPORT_CATEGORIES[thread.category] || SUPPORT_CATEGORIES.other;
    mutated = true;
  }
  if (mutated) {
    try {
      await thread.save();
    } catch (saveErr) {
      console.error('[SupportController] ensureThreadDefaults save failed:', saveErr.message);
    }
  }
};

const markThreadRead = async (thread, user) => {
  if (!thread) return thread;
  const userId = String(user ? (user._id || user.id) : '');
  const viewerRole = user && user.role === 'admin' ? 'support' : 'user';
  let mutated = false;

  const messages = thread.messages;
  if (Array.isArray(messages)) {
    messages.forEach((msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (!Array.isArray(msg.readBy)) {
        msg.readBy = [];
      }
      const alreadyRead = msg.readBy.some((entry) => String(entry.userId) === userId && entry.role === viewerRole);
      const authoredByViewer = msg.senderType === viewerRole;
      if (!alreadyRead && !authoredByViewer) {
        msg.readBy.push({ userId, role: viewerRole, readAt: new Date() });
        mutated = true;
      }
    });
  }

  if (mutated) {
    try {
      await thread.save();
    } catch (saveErr) {
      console.error('[SupportController] markThreadRead save failed:', saveErr.message);
    }
  }

  return thread;
};

const getMyThreads = async (req, res, next) => {
  try {
    const threads = await SupportThread.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ success: true, data: threads.map((thread) => ({
      ...(thread.toObject ? thread.toObject() : thread),
      lastMessage: thread.messages?.[thread.messages.length - 1] ? normalizeMessage(thread.messages[thread.messages.length - 1]) : null,
    })) });
  } catch (error) {
    next(error);
  }
};

const createThread = async (req, res, next) => {
  try {
    const { category = 'other', subject, message, priority = 'normal', attachments = [] } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'message is required.' });
    }

    const allowedPriorities = ['low', 'normal', 'high', 'urgent'];
    const normalizedPriority = allowedPriorities.includes(priority) ? priority : 'normal';
    const normalizedCategory = SUPPORT_CATEGORIES[category] ? category : 'other';
    const ticketId = makeTicketId();

    const slaHoursByPriority = { low: 72, normal: 48, high: 24, urgent: 8 };
    const slaDueAt = new Date(Date.now() + slaHoursByPriority[normalizedPriority] * 60 * 60 * 1000);

    const thread = await SupportThread.create({
      ticketId,
      userId: req.user.id,
      category: normalizedCategory,
      subject: subject || SUPPORT_CATEGORIES[normalizedCategory],
      priority: normalizedPriority,
      slaDueAt,
      messages: [{
        senderType: 'user',
        senderId: req.user.id,
        senderName: req.user.name,
        message,
        attachments,
        readBy: [{ userId: String(req.user.id), role: 'user', readAt: new Date() }],
      }],
    });

    await broadcastSupportEvent('support:ticket-created', { ticketId, thread: normalizeAdminThread(thread) });

    res.status(201).json({ success: true, message: 'Support ticket created.', data: thread });
  } catch (error) {
    next(error);
  }
};

const getThreadById = async (req, res, next) => {
  try {
    const thread = await SupportThread.findOne({ _id: req.params.id, userId: req.user.id });
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    await ensureThreadDefaults(thread);
    await markThreadRead(thread, req.user);
    res.json({ success: true, data: thread });
  } catch (error) {
    next(error);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const { message, attachments = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required.' });

    const thread = await SupportThread.findOne({ _id: req.params.id, userId: req.user.id });
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    await ensureThreadDefaults(thread);

    thread.messages.push({
      senderType: 'user',
      senderId: req.user.id,
      senderName: req.user.name,
      message,
      attachments,
      readBy: [{ userId: String(req.user.id), role: 'user', readAt: new Date() }],
    });
    thread.status = 'open';
    await thread.save();

    await broadcastSupportEvent('support:message', { ticketId: thread.ticketId, thread: normalizeAdminThread(thread), senderType: 'user' });

    res.json({ success: true, message: 'Message sent.', data: thread });
  } catch (error) {
    next(error);
  }
};

const closeThread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findOne({ _id: req.params.id, userId: req.user.id });
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });

    await ensureThreadDefaults(thread);
    thread.status = 'resolved';
    await thread.save();
    await broadcastSupportEvent('support:status', { ticketId: thread.ticketId, status: thread.status });
    res.json({ success: true, message: 'Support ticket closed.', data: thread });
  } catch (error) {
    next(error);
  }
};

const markThreadAsRead = async (req, res, next) => {
  try {
    const userId = String(req.user._id || req.user.id);
    const thread = await SupportThread.findOne({ _id: req.params.id, userId });
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });

    await ensureThreadDefaults(thread);
    await markThreadRead(thread, req.user);
    await broadcastSupportEvent('support:read', { ticketId: thread.ticketId, userId, role: 'user' });
    
    return res.json({ success: true, data: thread });
  } catch (error) {
    console.error('[SupportController] Error in markThreadAsRead:', error.message);
    return next(error);
  }
};

const adminListThreads = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      assigned = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assigned === 'unassigned') filter.assignedTo = { $exists: false };
    if (assigned === 'me') filter.assignedTo = req.user._id;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const threads = await SupportThread.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));
    const total = await SupportThread.countDocuments(filter);

    res.json({
      success: true,
      data: threads.map(normalizeAdminThread),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const adminGetThreadById = async (req, res, next) => {
  try {
    const thread = await SupportThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    await markThreadRead(thread, req.user);
    res.json({ success: true, data: normalizeAdminThread(thread) });
  } catch (error) {
    next(error);
  }
};

const adminAssignThread = async (req, res, next) => {
  try {
    const thread = await SupportThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });

    await ensureThreadDefaults(thread);

    thread.assignedTo = req.user._id;
    thread.assignedAgentName = req.user.name;
    thread.status = thread.status === 'closed' ? 'pending' : thread.status;
    await thread.save();

    res.json({ success: true, message: 'Ticket assigned successfully.', data: normalizeAdminThread(thread) });
  } catch (error) {
    next(error);
  }
};

const adminReplyToThread = async (req, res, next) => {
  try {
    const { message, attachments = [] } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required.' });

    const thread = await SupportThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });

    await ensureThreadDefaults(thread);

    thread.messages.push({
      senderType: 'support',
      senderId: req.user.id,
      senderName: req.user.name,
      message,
      attachments,
      readBy: [{ userId: String(req.user.id), role: 'support', readAt: new Date() }],
    });
    thread.status = 'pending';
    if (!thread.assignedTo) {
      thread.assignedTo = req.user._id;
      thread.assignedAgentName = req.user.name;
    }
    await thread.save();

    await broadcastSupportEvent('support:message', { ticketId: thread.ticketId, thread: normalizeAdminThread(thread), senderType: 'support' });

    res.json({ success: true, message: 'Reply sent.', data: normalizeAdminThread(thread) });
  } catch (error) {
    next(error);
  }
};

const adminUpdateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['open', 'pending', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    const thread = await SupportThread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, message: 'Support ticket not found.' });

    await ensureThreadDefaults(thread);

    thread.status = status;
    await thread.save();
    await broadcastSupportEvent('support:status', { ticketId: thread.ticketId, status: thread.status });

    res.json({ success: true, message: 'Status updated.', data: normalizeAdminThread(thread) });
  } catch (error) {
    next(error);
  }
};

const adminMarkThreadAsRead = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    }

    const thread = await SupportThread.findById(req.params.id);
    if (!thread) {
      console.error('[adminMarkThreadAsRead] FAIL: thread not found', req.params.id);
      return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    }

    console.log('[adminMarkThreadAsRead] thread found, messages:', thread.messages ? thread.messages.length : 'null');

    await ensureThreadDefaults(thread);

    console.log('[adminMarkThreadAsRead] ensureThreadDefaults OK');
    await markThreadRead(thread, req.user);
    console.log('[adminMarkThreadAsRead] markThreadRead OK');

    const userId = String(req.user._id || req.user.id);
    await broadcastSupportEvent('support:read', { ticketId: thread.ticketId, userId, role: 'support' });

    console.log('[adminMarkThreadAsRead] broadcast OK');
    const result = normalizeAdminThread(thread);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('[SupportController] Error in adminMarkThreadAsRead:', error.message, error.stack);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

module.exports = {
  getMyThreads,
  createThread,
  getThreadById,
  addMessage,
  closeThread,
  markThreadAsRead,
  adminListThreads,
  adminGetThreadById,
  adminAssignThread,
  adminReplyToThread,
  adminUpdateStatus,
  adminMarkThreadAsRead,
};