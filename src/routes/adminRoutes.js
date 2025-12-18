const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getDashboardSummary,
  getActivityFeed,
  getVerifications,
  getVerificationStats,
  approveVerification,
  rejectVerification,
  getUsers,
  getUserLoginHistory,
  getUserDetails,
  getAuditLogs
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(admin);

// Dashboard & Analytics
router.get('/dashboard', getDashboardSummary);
router.get('/analytics', getAnalytics);

// Activity Feed
router.get('/activity', getActivityFeed);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

// Verification Management
router.get('/verifications', getVerifications);
router.get('/verifications/stats', getVerificationStats);
router.post('/verifications/:id/approve', approveVerification);
router.post('/verifications/:id/reject', rejectVerification);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.get('/users/:id/login-history', getUserLoginHistory);

module.exports = router;
