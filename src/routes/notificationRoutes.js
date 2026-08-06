const express = require('express');
const router = express.Router();
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/engagementController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

module.exports = router;
