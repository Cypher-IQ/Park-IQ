const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const {
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
} = require('../controllers/supportController');

const router = express.Router();

router.get('/threads', protect, getMyThreads);
router.post('/threads', protect, createThread);
router.get('/threads/:id', protect, getThreadById);
router.post('/threads/:id/messages', protect, addMessage);
router.patch('/threads/:id/close', protect, closeThread);
router.patch('/threads/:id/read', protect, markThreadAsRead);

router.get('/admin/threads', protect, adminOnly, adminListThreads);
router.get('/admin/threads/:id', protect, adminOnly, adminGetThreadById);
router.patch('/admin/threads/:id/assign', protect, adminOnly, adminAssignThread);
router.post('/admin/threads/:id/reply', protect, adminOnly, adminReplyToThread);
router.patch('/admin/threads/:id/status', protect, adminOnly, adminUpdateStatus);
router.patch('/admin/threads/:id/read', protect, adminOnly, adminMarkThreadAsRead);

module.exports = router;