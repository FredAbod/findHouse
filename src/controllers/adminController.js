const asyncHandler = require('express-async-handler');
const adminService = require('../services/adminService');
const verificationService = require('../services/verificationService');

// @desc    Get analytics overview
// @route   GET /api/admin/analytics
// @access  Admin only
const getAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || '30d';
  const analytics = await adminService.getAnalytics(period);
  res.json(analytics);
});

// @desc    Get dashboard summary
// @route   GET /api/admin/dashboard
// @access  Admin only
const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await adminService.getDashboardSummary();
  res.json(summary);
});

// @desc    Get recent activity feed
// @route   GET /api/admin/activity
// @access  Admin only
const getActivityFeed = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const type = req.query.type || null;
  const activities = await adminService.getRecentActivity(limit, type);
  res.json(activities);
});

// @desc    Get pending verification requests
// @route   GET /api/admin/verifications
// @access  Admin only
const getVerifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || 'pending';
  
  let result;
  if (status === 'pending') {
    result = await verificationService.getPendingVerifications(page, limit);
  } else {
    // For other statuses, you might want to add a method
    result = await verificationService.getPendingVerifications(page, limit);
  }
  
  res.json(result);
});

// @desc    Get verification stats
// @route   GET /api/admin/verifications/stats
// @access  Admin only
const getVerificationStats = asyncHandler(async (req, res) => {
  const stats = await verificationService.getVerificationStats();
  res.json(stats);
});

// @desc    Approve user verification
// @route   POST /api/admin/verifications/:id/approve
// @access  Admin only
const approveVerification = asyncHandler(async (req, res) => {
  const result = await verificationService.approveVerification(
    req.params.id,
    req.user._id,
    req
  );
  res.json(result);
});

// @desc    Reject user verification
// @route   POST /api/admin/verifications/:id/reject
// @access  Admin only
const rejectVerification = asyncHandler(async (req, res) => {
  const result = await verificationService.rejectVerification(
    req.params.id,
    req.user._id,
    req.body.reason,
    req
  );
  res.json(result);
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin only
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const filters = {
    role: req.query.role,
    verificationStatus: req.query.verificationStatus,
    search: req.query.search
  };
  
  const users = await adminService.getUsers(page, limit, filters);
  res.json(users);
});

// @desc    Get user login history
// @route   GET /api/admin/users/:id/login-history
// @access  Admin only
const getUserLoginHistory = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = await adminService.getUserLoginHistory(req.params.id, limit);
  res.json(history);
});

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Admin only
const getUserDetails = asyncHandler(async (req, res) => {
  const User = require('../models/userModel');
  const Property = require('../models/propertyModel');
  const Booking = require('../models/bookingModel');

  const user = await User.findById(req.params.id)
    .select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Get user's properties and bookings count
  const [propertiesCount, bookingsCount] = await Promise.all([
    Property.countDocuments({ owner: user._id }),
    Booking.countDocuments({ $or: [{ user: user._id }, { owner: user._id }] })
  ]);

  res.json({
    ...user.toObject(),
    stats: {
      propertiesCount,
      bookingsCount
    }
  });
});

// @desc    Get audit logs
// @route   GET /api/admin/audit-logs
// @access  Admin only
const getAuditLogs = asyncHandler(async (req, res) => {
  const AuditLog = require('../models/auditLogModel');
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const filters = {
    action: req.query.action,
    admin: req.query.admin,
    targetUser: req.query.targetUser,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const result = await AuditLog.getAuditLogs(filters, page, limit);
  res.json(result);
});

// @desc    Get user's properties
// @route   GET /api/admin/users/:id/properties
// @access  Admin only
const getUserProperties = asyncHandler(async (req, res) => {
  const Property = require('../models/propertyModel');
  const User = require('../models/userModel');

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const properties = await Property.find({ owner: req.params.id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Property.countDocuments({ owner: req.params.id });

  res.json({
    properties,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

// @desc    Deactivate user account
// @route   PATCH /api/admin/users/:id/deactivate
// @access  Admin only
const deactivateUser = asyncHandler(async (req, res) => {
  const User = require('../models/userModel');
  const AuditLog = require('../models/auditLogModel');

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent deactivating admin users
  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Cannot deactivate admin users');
  }

  // Prevent deactivating yourself
  if (user._id.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error('Cannot deactivate your own account');
  }

  user.isActive = false;
  user.deactivatedAt = new Date();
  user.deactivatedBy = req.user._id;
  await user.save();

  // Log audit action
  await AuditLog.logAction(req.user._id, 'user_suspended', {
    targetUser: user._id,
    details: {
      userName: user.name,
      userEmail: user.email,
      reason: req.body.reason || 'No reason provided'
    }
  }, req);

  res.json({
    success: true,
    message: 'User account deactivated',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive
    }
  });
});

// @desc    Activate user account
// @route   PATCH /api/admin/users/:id/activate
// @access  Admin only
const activateUser = asyncHandler(async (req, res) => {
  const User = require('../models/userModel');
  const AuditLog = require('../models/auditLogModel');

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = true;
  user.deactivatedAt = undefined;
  user.deactivatedBy = undefined;
  await user.save();

  // Log audit action
  await AuditLog.logAction(req.user._id, 'user_unsuspended', {
    targetUser: user._id,
    details: {
      userName: user.name,
      userEmail: user.email
    }
  }, req);

  res.json({
    success: true,
    message: 'User account activated',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive
    }
  });
});

module.exports = {
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
  getAuditLogs,
  getUserProperties,
  deactivateUser,
  activateUser
};
